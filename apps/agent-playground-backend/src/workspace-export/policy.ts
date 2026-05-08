import path from "node:path";

const EXCLUDED_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  ".git",
  ".env",
  ".env.local",
  ".codingagent",
  ".agent",
]);

export const DEFAULT_TAR_EXCLUDES = [
  "./node_modules",
  "./.next",
  "./dist",
  "./build",
  "./out",
  "./.turbo",
  "./.cache",
  "./.git",
  "./.env",
  "./.env.local",
  "./.env.*.local",
  "./.codingagent",
  "./.agent",
];

export function normalizeArchivePath(inputPath: string): string {
  return inputPath
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part && part !== ".")
    .join("/");
}

export function shouldExcludeRelativePath(relativePath: string): boolean {
  const normalized = normalizeArchivePath(relativePath);
  if (!normalized) return false;

  const parts = normalized.split("/");
  for (const part of parts) {
    if (EXCLUDED_NAMES.has(part)) return true;
    if (/^\.env\..+\.local$/.test(part)) return true;
  }

  return false;
}

export function toRelativeArchivePath(
  rootPath: string,
  fullPath: string,
): string {
  return normalizeArchivePath(path.relative(rootPath, fullPath));
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildTarExcludeArgs(): string {
  return DEFAULT_TAR_EXCLUDES.map(
    (pattern) => `--exclude=${shellQuote(pattern)}`,
  ).join(" ");
}

export function safeExportFilename(options: {
  productId?: string;
  sessionId: string;
  extension?: string;
}): string {
  const product =
    (options.productId || "workspace")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";
  const session =
    options.sessionId
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .slice(0, 12) || "session";
  return `${product}-workspace-${session}.${options.extension ?? "tar.gz"}`;
}
