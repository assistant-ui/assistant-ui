import { extract } from "tar-stream";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";

const REPO = "assistant-ui/assistant-ui";
const BRANCH = "main";
const TARBALL_URL = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/${BRANCH}`;

// Exclude files that are large/useless for the agent
const EXCLUDE = [
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

// Cached for the lifetime of this serverless instance (typically 5-15 min on Vercel).
// Each cold start fetches fresh from GitHub.
let cached: Record<string, string> | null = null;

export async function getSourceSnapshot(): Promise<Record<string, string>> {
  if (cached) return cached;

  const response = await fetch(TARBALL_URL, {
    cache: "no-store",
    headers: process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {},
  });

  if (!response.ok) {
    throw new Error(`GitHub tarball fetch failed: ${response.status}`);
  }

  const files = await parseTarball(
    Buffer.from(await response.arrayBuffer()),
  );

  cached = files;
  return files;
}

async function parseTarball(buffer: Buffer): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  return new Promise((resolve, reject) => {
    const ex = extract();

    ex.on("entry", (header, stream, next) => {
      // Tarball paths start with "{repo}-{sha}/" prefix — strip it
      const fullPath = header.name.replace(/^[^/]+\//, "");

      const shouldInclude =
        header.type === "file" &&
        fullPath.length > 0 &&
        !EXCLUDE.some((re) => re.test(fullPath));

      if (shouldInclude) {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          files[fullPath] = Buffer.concat(chunks).toString("utf-8");
          next();
        });
      } else {
        stream.resume();
        stream.on("end", next);
      }
    });

    ex.on("finish", () => resolve(files));
    ex.on("error", reject);

    Readable.from(buffer).pipe(createGunzip()).pipe(ex);
  });
}
