import { FastifyInstance } from "fastify";
import { z } from "zod";
import { adapters } from "../adapters/index.js";
import type { MusicQuery, RawHit } from "../types.js";
import { canonicalKey, groupBy } from "../services/normalize.js";
import { scoreHit } from "../services/scoring.js";

const SearchSchema = z.object({
  artist: z.string().optional(),
  album: z.string().optional(),
  track: z.string().optional(),
  year: z.number().optional(),
  strict: z.boolean().optional(),
  preferredFormats: z.array(z.enum(["FLAC","MP3","AAC","WAV"])).optional(),
  minBitrateKbps: z.number().optional(),
  limit: z.number().optional()
});

export async function registerSearchRoute(app: FastifyInstance) {
  app.post("/search", async (req, reply) => {
    const body = SearchSchema.parse(req.body ?? {});
    const q: MusicQuery = body;

    // Run adapters in parallel
    const results = (await Promise.all(adapters.map(a => a.search(q)))).flat();

    // Group by canonical key (dedup-ish), pick top-N per cluster
    const clusters = groupBy(results, canonicalKey);
    const ranked: RawHit[] = [];

    for (const [, hits] of clusters) {
      const scored = hits
        .map(h => ({ hit: h, score: scoreHit(h, q) }))
        .sort((a, b) => b.score - a.score);
      if (scored[0]) ranked.push(scored[0].hit);
    }

    // Global rank
    const globallyScored = ranked
      .map(h => ({ hit: h, score: scoreHit(h, q) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, q.limit ?? 25)
      .map(x => x.hit);

    return reply.send({ results: globallyScored });
  });
}
