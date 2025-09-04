# Music Scraper Engine (Starter Kit)
A modular, legal‑first "Cocoscrapers‑for‑music" engine that searches providers (starting with **Internet Archive**), normalizes and scores results, resolves to direct links, and optionally **ingests** tracks into a filesystem for playback via **Navidrome**.

> ⚖️ **Use ethically & legally.** This template points at legal/open sources (Internet Archive) and your own content. Do **not** use it to infringe copyrights.

## Stack
- **Node 20 + TypeScript**
- **Fastify** API (`/search`, `/resolve`, `/ingest`)
- **BullMQ + Redis** for ingest jobs
- **Navidrome** to serve the final music library (optional but included in Docker)
- **Adapters**: Internet Archive and YouTube (via `yt-dlp`)

## Quick start (Docker)
```bash
# 1) Copy env and edit as needed
cp .env.example .env

# 2) Build and run everything (API + Worker + Redis + Navidrome)
docker compose up --build
```

- API: http://localhost:8080
- Navidrome: http://localhost:4533 (user: `admin`, pass: `admin` by default - change it!)
- Redis: for queues
- The Navidrome library folder is mounted at `./data/music` on your host (edit in compose file).

## Environment
These environment variables are supported (see `.env.example`):

- `PORT` – API port. Default: `8080`.
- `REDIS_URL` – Redis connection string. In Docker Compose use `redis://redis:6379`; locally: `redis://localhost:6379`.
- `MUSIC_DIR` – Destination music library path. In Docker use `/data/music` (mounted to `./data/music`).
- `STAGING_DIR` – Temporary downloads path. In Docker use `/data/staging` (mounted to `./data/staging`).

## How to use

### Option A: Run everything with Docker (recommended)
1. Copy environment: `cp .env.example .env` (adjust paths if needed)
2. Start stack: `docker compose up --build`
3. Open the UI:
   - If you prefer the included React UI, run it locally (see Option B, UI section)
   - Or use any HTTP client to call the API at `http://localhost:8080`
4. In Navidrome (`http://localhost:4533`), set up the admin account and confirm the library path is `/music` (already mounted to `./data/music`). New ingested tracks will appear after scans.

### Option B: Local development (API + Worker locally, infra via Docker)
Prereqs: Node 20+, Docker (for Redis and optional Navidrome). If you want YouTube search/resolve locally without Docker, install `yt-dlp` and `ffmpeg` on your machine and ensure they are in your `PATH`.

1. Install deps
```bash
npm install
```

2. Run infra containers only
```bash
docker compose up -d redis navidrome
```

3. Start API and worker in two terminals
```bash
npm run dev           # Fastify API on http://localhost:8080
npm run worker:dev    # BullMQ worker processing ingest jobs
```

4. Start the UI (optional)
```bash
cd music-ui
npm install
npm run dev
# open the shown URL (usually http://localhost:5173) and set API Base to http://localhost:8080
```

5. Workflow
- Use the UI to search → preview → ingest
- Ingested files land under `./data/staging` during download, then are moved into `./data/music`
- Navidrome scans `/music` (mounted to `./data/music`) automatically on schedule

## Endpoints
- `POST /search` – body: `{ artist?, album?, track?, preferredFormats?, minBitrateKbps? }`
- `POST /resolve` – body: `{ hit: RawHit }` → returns a direct (temporary) URL if possible
- `POST /ingest` – body: `{ hit: RawHit, transcode? }` → enqueues a download job; returns `{ jobId }`

### Example cURL
```bash
curl -s http://localhost:8080/search \
  -H 'content-type: application/json' \
  -d '{"artist":"Beethoven","track":"Symphony"}' | jq
```

## Project layout
```
.
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── src
│   ├── index.ts                # Fastify bootstrap
│   ├── routes
│   │   ├── search.ts
│   │   ├── resolve.ts
│   │   └── ingest.ts
│   ├── types.ts
│   ├── adapters
│   │   ├── index.ts
│   │   └── archiveAdapter.ts   # Internet Archive
│   ├── services
│   │   ├── normalize.ts
│   │   ├── scoring.ts
│   │   └── resolver.ts
│   └── queue
│       ├── jobs.ts
│       └── worker.ts
└── data
    ├── music/                  # Navidrome library mount (host volume via Docker)
    └── staging/                # temporary downloads
```

## Add new adapters
Create `src/adapters/yourAdapter.ts` that implements `Adapter` from `src/types.ts` and export it in `src/adapters/index.ts`.

## Notes
- This is a starter; tagging/transcoding are left as TODOs in the worker for simplicity.
- Internet Archive search tries to pick reasonable audio files; refine selection logic as you add sources.
