import { readFileSync } from "node:fs";
import path from "node:path";

export const SOURCE_SNAPSHOT_EXCLUDE = [
  /pnpm-lock\.yaml$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.svg$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.mp[34]$/,
  /\.webm$/,
  /\.webp$/,
  /\.pdf$/,
  /\.zip$/,
  /\.tar$/,
  /\.gz$/,
  /\/dist\//,
  /\/\.next\//,
];

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "generated",
  "source-snapshot.json",
);

let cachedSnapshot: Record<string, string> | null = null;

export function getSourceSnapshot(): Record<string, string> {
  if (cachedSnapshot) return cachedSnapshot;

  cachedSnapshot = JSON.parse(
    readFileSync(SNAPSHOT_PATH, "utf-8"),
  ) as Record<string, string>;

  return cachedSnapshot;
}
