import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RawHit } from "../types.js";
import { addIngestJob } from "../queue/jobs.js";

const IngestSchema = z.object({
  hit: z.any(),
  transcode: z.enum(["copy", "aac320", "mp3V0"]).optional()
});

export async function registerIngestRoute(app: FastifyInstance) {
  app.post("/ingest", async (req, reply) => {
    const { hit, transcode } = IngestSchema.parse(req.body ?? {}) as { hit: RawHit; transcode?: "copy"|"aac320"|"mp3V0" };
    const job = await addIngestJob({ hit, transcode: transcode ?? "copy" });
    return reply.send({ jobId: job.id });
  });
}
