import type { RawHit, MusicQuery } from "../types.js";
import { relevance } from "./normalize.js";

function formatQuality(fmt?: string): number {
  if (!fmt) return 0.4;
  const f = fmt.toUpperCase();
  if (f.includes("FLAC") || f.includes("WAV")) return 1.0;
  if (f.includes("320")) return 0.8;
  if (f.includes("MP3")) return 0.6;
  return 0.5;
}

function sourceTrust(source: string): number {
  if (source === "archive") return 0.9;
  if (source === "local") return 0.95;
  return 0.6;
}

export function scoreHit(hit: RawHit, q: MusicQuery): number {
  const r = relevance(hit, { artist: q.artist, album: q.album, track: q.track });
  const fq = formatQuality(hit.format);
  const st = sourceTrust(hit.source);
  const completeness = hit.kind === "album" ? 0.9 : 0.6;
  const bitrateScore = hit.bitrateKbps ? Math.min(hit.bitrateKbps / 320, 1) : 0.5;

  return 0.45 * r + 0.25 * fq + 0.15 * st + 0.10 * completeness + 0.05 * bitrateScore;
}
