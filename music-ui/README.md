# Music Scraper UI

Minimal React UI for the Music Scraper API.

## Run locally
```bash
cd music-ui
npm install
npm run dev
# open the shown URL (e.g. http://localhost:5173)
```

In the UI header, set "API Base" to `http://localhost:8080` (or your deployment).

## What it does
- Search with artist/album/track → calls `POST /search`
- Preview a result → calls `POST /resolve` and streams audio
- Ingest a result → calls `POST /ingest` to enqueue a download job

## Build for production
```bash
npm run build
# output in music-ui/dist
```

