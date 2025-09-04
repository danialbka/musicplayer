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

  return null;
}
