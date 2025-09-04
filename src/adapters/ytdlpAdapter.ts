import type { Adapter, MusicQuery, RawHit } from "../types.js";

export class YtDlpAdapter implements Adapter {
  name = "youtube";

  async search(q: MusicQuery): Promise<RawHit[]> {
    const { execa } = await import("execa");
    const parts = [q.artist, q.album, q.track].filter(Boolean) as string[];
    const query = parts.join(" ").trim() || "classical music";
    const searchArg = `ytsearch${q.limit ?? 10}:${query}`;

    const { stdout } = await execa("yt-dlp", [
      "-J",
      "--flat-playlist",
      searchArg
    ]);

    const data = JSON.parse(stdout);
    const entries = Array.isArray(data?.entries) ? data.entries : [];

    const results: RawHit[] = entries
      .filter((e: any) => e && e.title && (e.url || e.id))
      .map((e: any) => ({
        source: "youtube",
        kind: "track",
        title: String(e.title),
        artist: q.artist,
        album: q.album,
        year: undefined,
        urls: [{ page: `https://www.youtube.com/watch?v=${e.id || e.url}` }],
        extra: { videoId: e.id || e.url }
      }));

    return results;
  }
}


