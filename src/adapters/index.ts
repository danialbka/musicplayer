import type { Adapter } from "../types.js";
import { ArchiveAdapter } from "./archiveAdapter.js";

export const adapters: Adapter[] = [
  new ArchiveAdapter(),
  // Add new adapters here
];
