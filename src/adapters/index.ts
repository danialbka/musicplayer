import type { Adapter } from "../types.js";
import { ArchiveAdapter } from "./archiveAdapter.js";
import { YtDlpAdapter } from "./ytdlpAdapter.js";

export const adapters: Adapter[] = [
  new ArchiveAdapter(),
  new YtDlpAdapter(),
];
