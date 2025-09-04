import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RawHit } from "../types.js";
import { resolveDirectUrl } from "../services/resolver.js";

const ResolveSchema = z.object({
  hit: z.any()
});

export async function registerResolveRoute(app: FastifyInstance) {
  app.post("/resolve", async (req, reply) => {
    const { hit } = ResolveSchema.parse(req.body ?? {}) as { hit: RawHit };
    const res = await resolveDirectUrl(hit);
    if (!res) return reply.code(404).send({ error: "Unable to resolve direct URL for this hit." });
    return reply.send(res);
  });
}
