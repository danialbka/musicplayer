import type { RawHit } from "../types.js";

function norm(s?: string) {
  return (s || "").toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\[\(].*?[\]\)]/g, "") // remove bracketed qualifiers
    .replace(/[^a-z0-9\s\-&']/g, "")
    .trim();
}

export function canonicalKey(hit: RawHit): string {
  const t = norm(hit.title);
  const a = norm(hit.artist);
  const alb = norm(hit.album);
  const dur = hit.durationSec ? Math.round(hit.durationSec) : 0;
  const durBucket = Math.round(dur / 2) * 2; // ±2s bucket-ish
  return [a, alb, t, durBucket].filter(Boolean).join("|");
}

export function similarity(a: string, b: string): number {
  // simple token-set Jaccard
  const A = new Set(norm(a).split(/\s+/).filter(Boolean));
  const B = new Set(norm(b).split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = new Set([...A, ...B]).size;
  return inter / union;
}

export function relevance(hit: RawHit, want: {artist?: string; album?: string; track?: string}): number {
  let r = 0;
  if (want.artist && hit.artist) r += similarity(want.artist, hit.artist) * 0.4;
  if (want.album && hit.album) r += similarity(want.album, hit.album) * 0.3;
  if (want.track && hit.title) r += similarity(want.track, hit.title) * 0.5;
  return Math.min(1, r);
}

export function groupBy<T, K>(items: T[], keyFn: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k);
    if (arr) arr.push(it); else m.set(k, [it]);
  }
  return m;
}
