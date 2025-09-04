import React, { useEffect, useMemo, useRef, useState } from "react";
import './index.css'
// Minimal single-file React UI for your music-scraper API
// Drop into any React app (Vite/Next) or preview here. No external UI libs needed.
// Default API base: http://localhost:8080

// ---- Types ----
type RawHit = {
  source: "archive" | "local" | "custom";
  kind: "track" | "album";
  title: string;
  artist?: string;
  album?: string;
  year?: number;
  urls: { stream?: string; download?: string; page?: string }[];
  format?: string;
  bitrateKbps?: number;
  durationSec?: number;
  sizeBytes?: number;
  extra?: Record<string, unknown>;
};

type SearchBody = {
  artist?: string;
  album?: string;
  track?: string;
  year?: number;
  strict?: boolean;
  preferredFormats?: Array<"FLAC" | "MP3" | "AAC" | "WAV">;
  minBitrateKbps?: number;
  limit?: number;
};

// ---- Helpers ----
const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
const storage = {
  get(key: string, fallback = "") { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } },
  set(key: string, val: string) { try { localStorage.setItem(key, val) } catch {}
  }
};

function useLocalStorage(key: string, initial: string) {
  const [v, setV] = useState<string>(() => storage.get(key, initial));
  useEffect(() => { storage.set(key, v) }, [key, v]);
  return [v, setV] as const;
}

function prettyDuration(seconds?: number) {
  if (!seconds) return "";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ---- Main Component ----
export default function App() {
  const [apiBase, setApiBase] = useLocalStorage("music_api_base", "http://localhost:8080");

  const [artist, setArtist] = useLocalStorage("music_q_artist", "");
  const [album, setAlbum] = useLocalStorage("music_q_album", "");
  const [track, setTrack] = useLocalStorage("music_q_track", "");

  const [limit, setLimit] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RawHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function call<T>(path: string, body?: any): Promise<T> {
    const url = `${apiBase}${path}`;
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true); setError(null); setResults([]);
    try {
      const body: SearchBody = { artist: artist || undefined, album: album || undefined, track: track || undefined, limit };
      const data = await call<{ results: RawHit[] }>("/search", body);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function onPreview(hit: RawHit) {
    setError(null);
    try {
      const data = await call<{ directUrl: string; filename?: string }>("/resolve", { hit });
      setCurrentUrl(data.directUrl);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      setError(err?.message || "Unable to resolve stream");
    }
  }

  async function onIngest(hit: RawHit) {
    setError(null);
    try {
      const data = await call<{ jobId: string }>("/ingest", { hit, transcode: "copy" });
      alert(`Enqueued ingest job: ${data.jobId}`);
    } catch (err: any) {
      setError(err?.message || "Ingest failed");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Music Scraper UI</h1>
            <p className="text-neutral-400">Search → Preview → Ingest to Navidrome</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">API Base</label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="http://localhost:8080"
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </header>

        <form onSubmit={onSearch} className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            className="sm:col-span-2 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            placeholder="Album"
            className="sm:col-span-2 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            placeholder="Track"
            className="sm:col-span-2 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex items-center gap-2 sm:col-span-2">
            <label className="text-sm text-neutral-400">Limit</label>
            <input
              type="number"
              value={limit}
              min={1}
              max={50}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-24 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center justify-end gap-3">
            <button
              type="submit"
              className={cls("px-4 py-2 rounded-xl font-medium",
                "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition")}
              disabled={loading}
            >{loading ? "Searching…" : "Search"}</button>

            <button
              type="button"
              onClick={() => { setArtist(""); setAlbum(""); setTrack(""); setResults([]); setCurrentUrl(null); setError(null); }}
              className="px-4 py-2 rounded-xl font-medium bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
            >Clear</button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-900/30 border border-red-800 text-red-200">
            {error}
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((hit, i) => (
            <article key={i} className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{hit.title}</h3>
                  <p className="text-neutral-400">{hit.artist || "Unknown Artist"}{hit.album ? ` · ${hit.album}` : ""}</p>
                  <p className="text-neutral-500 text-sm">{hit.source.toUpperCase()} {hit.year ? `· ${hit.year}` : ""}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700">{hit.kind}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onPreview(hit)}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-medium"
                >Preview</button>
                <button
                  onClick={() => onIngest(hit)}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-medium"
                >Ingest</button>
                {hit.urls?.[0]?.page && (
                  <a href={hit.urls[0].page!} target="_blank" className="px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">Source</a>
                )}
              </div>

              {hit.durationSec && (
                <p className="text-neutral-500 text-sm">Duration: {prettyDuration(hit.durationSec)}</p>
              )}
            </article>
          ))}
        </section>

        <footer className="mt-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
          <p className="text-neutral-400 mb-2">Now Playing</p>
          <audio ref={audioRef} controls className="w-full">
            {currentUrl ? <source src={currentUrl} /> : null}
            Your browser does not support the audio element.
          </audio>
          {!currentUrl && <p className="text-neutral-600 text-sm mt-2">Choose a result and hit <span className="text-neutral-300">Preview</span> to stream.</p>}
        </footer>
      </div>
    </div>
  );
}
