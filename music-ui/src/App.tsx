import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

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

const cls = (...xs: (string | false | null | undefined)[]) =>
  xs.filter(Boolean).join(" ");

const storage = {
  get(key: string, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, val: string) {
    try {
      localStorage.setItem(key, val);
    } catch {
      /* empty */
    }
  },
};

function useLocalStorage(key: string, initial: string) {
  const [v, setV] = useState<string>(() => storage.get(key, initial));
  useEffect(() => {
    storage.set(key, v);
  }, [key, v]);
  return [v, setV] as const;
}

function prettyDuration(seconds?: number) {
  if (!seconds) return "";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const discoverNav = {
  title: "Discover",
  items: ["Listen Now", "Browse", "Radio"],
};

const libraryNav = {
  title: "Library",
  items: [
    "Recent",
    "Artists",
    "Albums",
    "Songs",
    "Made for You",
  ],
};

const playlistsNav = {
  title: "Playlists",
  items: [
    "Chill Mix",
    "Favorites Mix",
    "Work Vibes",
    "Family Roadtrip",
    "Infini 2000's",
    "Coding Session",
  ],
};

export default function App() {
  const [apiBase, setApiBase] = useLocalStorage(
    "music_api_base",
    "http://localhost:8080",
  );

  const [artist, setArtist] = useLocalStorage("music_q_artist", "");
  const [album, setAlbum] = useLocalStorage("music_q_album", "");
  const [track, setTrack] = useLocalStorage("music_q_track", "");

  const [limit, setLimit] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RawHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function call<T>(path: string, body?: unknown): Promise<T> {
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
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const body: SearchBody = {
        artist: artist || undefined,
        album: album || undefined,
        track: track || undefined,
        limit,
      };
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
      const data = await call<{ directUrl: string; filename?: string }>(
        "/resolve",
        { hit },
      );
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
      const data = await call<{ jobId: string }>("/ingest", {
        hit,
        transcode: "copy",
      });
      alert(`Enqueued ingest job: ${data.jobId}`);
    } catch (err: any) {
      setError(err?.message || "Ingest failed");
    }
  }

  const highlightHit = results[0];
  const otherResults = useMemo(() => results.slice(1), [results]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex">
      <aside className="hidden xl:flex w-72 flex-col border-r border-white/5 bg-black/30 backdrop-blur-xl px-8 py-10 gap-10">
        <div>
          <div className="uppercase text-xs tracking-[0.3em] text-white/40">
            Music
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Listen Now</h1>
        </div>

        {[discoverNav, libraryNav, playlistsNav].map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-white/40">
              {section.title}
            </div>
            <nav className="space-y-1 text-sm text-white/70">
              {section.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cls(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 transition",
                    item === "Listen Now"
                      ? "bg-white/10 text-white"
                      : "hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  {item}
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="mt-auto text-xs text-white/40">
          Connected to <span className="text-white/70">Navidrome</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between gap-6 border-b border-white/5 bg-black/30 px-6 py-6 backdrop-blur-xl lg:px-10">
          <div className="flex items-center gap-4">
            <nav className="flex items-center rounded-full bg-white/10 p-1 text-sm">
              {["Music", "Podcasts", "Live"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cls(
                    "rounded-full px-4 py-2 transition",
                    tab === "Music"
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
              <span role="img" aria-label="Search">
                🔍
              </span>
              <span>Search the catalog</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="http://localhost:8080"
              className="hidden lg:block w-72 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Add music
            </button>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
              onClick={() => {
                setArtist("");
                setAlbum("");
                setTrack("");
                setResults([]);
                setCurrentUrl(null);
                setError(null);
              }}
            >
              Clear
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-black/20 via-black/10 to-black/40 px-6 py-10 lg:px-14">
          <form
            onSubmit={onSearch}
            className="grid gap-8 lg:grid-cols-[2.2fr,1fr]"
          >
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-8 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.6)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    Listen Now
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold">
                    Curate the perfect session
                  </h2>
                  <p className="mt-3 max-w-md text-sm text-white/70">
                    Search any artist, album, or track across your connected sources. Preview instantly and queue ingests in a single place.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={cls(
                    "w-full rounded-2xl px-5 py-3 text-sm font-semibold transition lg:w-auto",
                    loading
                      ? "bg-white/20 text-white/60"
                      : "bg-white text-black hover:scale-[1.02] hover:bg-white/90",
                  )}
                >
                  {loading ? "Searching…" : "Search library"}
                </button>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Artist
                  <input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Miles Davis"
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Album
                  <input
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    placeholder="e.g. Kind of Blue"
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Track
                  <input
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    placeholder="e.g. So What"
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-4 text-sm text-white/70 lg:flex-row lg:items-center">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <span>Limit</span>
                  <input
                    type="number"
                    value={limit}
                    min={1}
                    max={50}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-20 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  />
                </label>
                <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/50">
                  API base
                  <code className="rounded-lg bg-black/60 px-3 py-1 text-white/70">
                    {apiBase}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Status
              </p>
              {error ? (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-5 text-sm text-white/60">
                  {results.length === 0
                    ? "Run a search to populate your dashboard."
                    : `${results.length} result${results.length === 1 ? "" : "s"} ready.`}
                </div>
              )}

              <div className="mt-auto space-y-2 text-xs text-white/50">
                <div className="flex items-center justify-between">
                  <span>Queue</span>
                  <span>{results.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Now Playing</span>
                  <span>{currentUrl ? "Streaming" : "Idle"}</span>
                </div>
              </div>
            </div>
          </form>

          {highlightHit && (
            <section className="mt-12 grid gap-8 lg:grid-cols-[2fr,1fr]">
              <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8">
                <div className="absolute inset-y-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.15),_transparent_60%)]" aria-hidden="true" />
                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Listen Now
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{highlightHit.title}</h3>
                    <p className="mt-1 text-white/60">
                      {highlightHit.artist || "Unknown Artist"}
                      {highlightHit.album ? ` · ${highlightHit.album}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-white/50">
                      {highlightHit.source.toUpperCase()}
                      {highlightHit.year ? ` · ${highlightHit.year}` : ""}
                      {highlightHit.durationSec
                        ? ` · ${prettyDuration(highlightHit.durationSec)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 text-sm font-medium text-black lg:flex-row">
                    <button
                      onClick={() => onPreview(highlightHit)}
                      className="rounded-full bg-white px-6 py-2 text-center hover:bg-white/90"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => onIngest(highlightHit)}
                      className="rounded-full bg-emerald-500 px-6 py-2 text-center text-white hover:bg-emerald-400"
                    >
                      Ingest
                    </button>
                    {highlightHit.urls?.[0]?.page && (
                      <a
                        href={highlightHit.urls[0].page!}
                        target="_blank"
                        className="rounded-full border border-white/40 px-6 py-2 text-center text-white/70 hover:text-white"
                      >
                        Source
                      </a>
                    )}
                  </div>
                </div>
              </article>

              <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-sm text-white/60">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Metadata
                </p>
                <div className="mt-4 space-y-2">
                  {highlightHit.format && (
                    <div className="flex items-center justify-between">
                      <span>Format</span>
                      <span>{highlightHit.format}</span>
                    </div>
                  )}
                  {highlightHit.bitrateKbps && (
                    <div className="flex items-center justify-between">
                      <span>Bitrate</span>
                      <span>{highlightHit.bitrateKbps} kbps</span>
                    </div>
                  )}
                  {highlightHit.sizeBytes && (
                    <div className="flex items-center justify-between">
                      <span>Size</span>
                      <span>
                        {(highlightHit.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="mt-12">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Made for You
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Recently Discovered
                </h3>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {otherResults.length === 0 && !highlightHit ? (
                <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/60">
                  Start exploring by running a search.
                </div>
              ) : (
                (highlightHit ? otherResults : results).map((hit, i) => (
                  <article
                    key={`${hit.title}-${i}`}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40 transition hover:border-white/30 hover:bg-black/30"
                  >
                    <div className="relative h-40 overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_70%)] transition group-hover:scale-105" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 px-5 py-5 text-sm text-white/70">
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {hit.title}
                        </h4>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/40">
                          {hit.source}
                        </p>
                        <p className="mt-2 text-white/60">
                          {hit.artist || "Unknown Artist"}
                          {hit.album ? ` · ${hit.album}` : ""}
                        </p>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-3 text-xs font-medium">
                        <button
                          onClick={() => onPreview(hit)}
                          className="rounded-full border border-white/30 px-4 py-2 text-white hover:bg-white/10"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => onIngest(hit)}
                          className="rounded-full border border-emerald-400/70 bg-emerald-500/20 px-4 py-2 text-emerald-200 hover:bg-emerald-400/30"
                        >
                          Ingest
                        </button>
                        {hit.urls?.[0]?.page && (
                          <a
                            href={hit.urls[0].page!}
                            target="_blank"
                            className="rounded-full border border-white/20 px-4 py-2 text-white/70 hover:text-white"
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-12 rounded-3xl border border-white/10 bg-black/40 p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Now Playing
                </p>
                <p className="mt-2 text-sm text-white/60">
                  {currentUrl
                    ? "Streaming from your latest preview."
                    : "Choose a result and hit Preview to stream instantly."}
                </p>
              </div>
              <audio
                ref={audioRef}
                controls
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white lg:w-96"
              >
                {currentUrl ? <source src={currentUrl} /> : null}
                Your browser does not support the audio element.
              </audio>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
