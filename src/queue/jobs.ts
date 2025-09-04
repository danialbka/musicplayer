import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "dotenv";
config();

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
export const ingestQueue = new Queue("ingest", { connection });

type IngestPayload = {
  hit: any;
  transcode: "copy"|"aac320"|"mp3V0";
};

export function addIngestJob(payload: IngestPayload) {
  return ingestQueue.add("ingest-track", payload, { attempts: 2, removeOnComplete: true, removeOnFail: false });
}
