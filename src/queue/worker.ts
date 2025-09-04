import { Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "dotenv";
import { resolveDirectUrl } from "../services/resolver.js";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";

async function moveFileSafe(src: string, dest: string) {
  try {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.rename(src, dest); // fast if same mount
  } catch (err: any) {
    if (err?.code === "EXDEV") {
      // Cross-device: fallback to copy → unlink
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.copyFile(src, dest);
      await fsp.unlink(src);
    } else {
      throw err;
    }
  }
}

config();
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

const MUSIC_DIR = process.env.MUSIC_DIR || "/data/music";
const STAGING_DIR = process.env.STAGING_DIR || "/data/staging";

async function ensureDirs() {
  await fsp.mkdir(MUSIC_DIR, { recursive: true });
  await fsp.mkdir(STAGING_DIR, { recursive: true });
}

async function downloadToFile(url: string, destPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await fsp.writeFile(destPath, buf);
}

function safeName(s?: string, fallback = "Unknown") {
  if (!s) return fallback;
  return s.replace(/[\/\\:*?"<>|]/g, "_").trim() || fallback;
}

export const worker = new Worker("ingest", async (job) => {
  await ensureDirs();
  const { hit, transcode } = job.data as { hit: any; transcode: "copy"|"aac320"|"mp3V0" };

  // NEW: validate payload
  if (!hit || typeof hit !== "object") {
    throw new Error("Invalid job payload: missing 'hit'");
  }

  const resolved = await resolveDirectUrl(hit);
  if (!resolved) throw new Error("Could not resolve direct URL");

  const artist = safeName(hit.artist, "Unknown Artist");
  const album = safeName(hit.album, "Unknown Album");
  const title = safeName(hit.title, "Unknown Track");
  const ext = path.extname(resolved.filename || "").replace(".", "") || "mp3";

  const tmpPath = path.join(STAGING_DIR, `${Date.now()}_${title}.${ext}`);
  await downloadToFile(resolved.directUrl, tmpPath);

  // use your moveFileSafe() if you added it earlier to avoid EXDEV issues
  // await moveFileSafe(tmpPath, finalPath);
  const finalPath = path.join(MUSIC_DIR, artist, album, `${title}.${ext}`);
  await fsp.mkdir(path.dirname(finalPath), { recursive: true });
  await fsp.copyFile(tmpPath, finalPath);
  await fsp.unlink(tmpPath);

  return { finalPath };
}, { connection });

worker.on("completed", (job, result) => {
  console.log(`[worker] Completed job ${job.id}`, result);
});
worker.on("failed", (job, err) => {
  console.error(`[worker] Failed job ${job?.id}:`, err);
});
