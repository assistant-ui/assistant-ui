import path from "node:path";

export function getGithubArchiveTarballUrl(repo: string, ref: string): string {
  return `https://github.com/${repo}/archive/${ref}.tar.gz`;
}

export function isTarLinkEntry(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  if (!("type" in entry)) return false;
  const t = (entry as { type?: unknown }).type;
  return t === "SymbolicLink" || t === "Link";
}

export function assertSafeTarEntryPath(
  rootDir: string,
  entryPath: string,
): void {
  if (path.isAbsolute(entryPath)) {
    throw new Error(`Template tarball contains an absolute path: ${entryPath}`);
  }

  const resolved = path.resolve(rootDir, entryPath);
  if (resolved !== rootDir && !resolved.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Template tarball contains an unsafe path: ${entryPath}`);
  }
}

export function filterTemplateTarEntry(
  rootDir: string,
  entryPath: string,
  entry: unknown,
): boolean {
  if (isTarLinkEntry(entry)) return false;
  assertSafeTarEntryPath(rootDir, entryPath);
  return true;
}
