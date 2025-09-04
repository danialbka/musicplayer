import type { RawHit } from "../types.js";

export async function resolveDirectUrl(hit: RawHit | null | undefined): Promise<{ directUrl: string; filename?: string } | null> {
  // NEW: guard invalid payloads
  if (!hit || typeof hit !== "object" || !("source" in hit)) return null;

  if (hit.source === "archive") {
    const identifier = (hit.extra && (hit.extra as any).identifier) as string | undefined;
    if (!identifier) return null;

    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();

    const files: any[] = meta?.files || [];
    const pick = (want: (f: any) => boolean) => files.find(want);

    let file =
      pick(f => /flac$/i.test(f.name)) ||
      pick(f => /wav$/i.test(f.name)) ||
      pick(f => /320\.mp3$/i.test(f.name)) ||
      pick(f => /\.mp3$/i.test(f.name)) ||
      files[0];

    if (!file) return null;

    const directUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(file.name)}`;
    return { directUrl, filename: file.name };
  }

  if (hit.source === "youtube") {
    const { execa } = await import("execa");
    const videoId = (hit.extra as any)?.videoId as string | undefined;
    const pageUrl = hit.urls?.find(u => u.page)?.page || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
    if (!pageUrl) return null;

    const { stdout } = await execa("yt-dlp", ["-J", pageUrl]);
    const info = JSON.parse(stdout);

    const fmts: any[] = Array.isArray(info?.formats) ? info.formats : [];
    const audioOnly = fmts.filter(f => (f.acodec && f.acodec !== "none") && (!f.vcodec || f.vcodec === "none"));
    audioOnly.sort((a, b) => (b.abr || 0) - (a.abr || 0));

    let directUrl = audioOnly[0]?.url as string | undefined;
    if (!directUrl) {
      const { stdout: gOut } = await execa("yt-dlp", ["-f", "bestaudio", "-g", pageUrl]);
      directUrl = gOut.split(/\r?\n/)[0]?.trim();
    }
    if (!directUrl) return null;

    const filename = `${info?.uploader || hit.artist || "YouTube"} - ${info?.title || hit.title}.m4a`;

    return { directUrl, filename };
  }

  return null;
}
