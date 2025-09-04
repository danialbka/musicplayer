import type { Adapter, MusicQuery, RawHit } from "../types.js";

/**
 * Internet Archive adapter (legal/open content).
 * Uses the advancedsearch endpoint to find audio items.
 */
export class ArchiveAdapter implements Adapter {
  name = "archive";

  async search(q: MusicQuery): Promise<RawHit[]> {
    const terms: string[] = ['mediatype:(audio)'];
    if (q.artist) terms.push(`creator:(${this.escape(q.artist)})`);
    if (q.album) terms.push(`title:(${this.escape(q.album)})`);
    if (q.track) terms.push(`title:(${this.escape(q.track)})`);

    const query = terms.join(" AND ");
    const rows = Math.min(q.limit ?? 25, 50);

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&sort[]=downloads+desc&rows=${rows}&output=json`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const docs = data?.response?.docs ?? [];
    const out: RawHit[] = [];
    for (const d of docs) {
      const identifier = d.identifier as string;
      const title = (d.title || identifier) as string;
      const artist = Array.isArray(d.creator) ? d.creator[0] : (d.creator || undefined);

      out.push({
        source: "archive",
        kind: "track",
        title,
        artist,
        album: undefined,
        year: d.year ? Number(d.year) : undefined,
        urls: [
          { page: `https://archive.org/details/${identifier}` }
        ],
        format: undefined,
        bitrateKbps: undefined,
        durationSec: undefined,
        sizeBytes: undefined,
        extra: { identifier }
      });
    }
    return out;
  }

  private escape(s: string): string {
    return s.replace(/["\\]/g, " ").trim();
  }
}
