export type MusicQuery = {
  artist?: string;
  album?: string;
  track?: string;
  year?: number;
  strict?: boolean;
  preferredFormats?: Array<"FLAC"|"MP3"|"AAC"|"WAV">;
  minBitrateKbps?: number;
  limit?: number;
};

export type RawHit = {
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

export interface Adapter {
  name: string;
  search(q: MusicQuery): Promise<RawHit[]>;
}
