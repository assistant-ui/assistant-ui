import { getReleases } from "./github";

export type PackageRelease = {
  version: string;
  pkg: string;
  body: string;
  url: string;
  date: string;
};

export type ReleaseGroup = {
  date: string;
  releases: PackageRelease[];
};

function linkifyCommits(markdown: string): string {
  return markdown.replace(
    /\[([a-f0-9]{6,10})\]/gi,
    (_, hash: string) =>
      `[${hash}](https://github.com/assistant-ui/assistant-ui/commit/${hash})`,
  );
}

function parseTag(tag: string): { pkg: string; version: string } | null {
  const lastAt = tag.lastIndexOf("@");
  if (lastAt <= 0) return null;
  return { pkg: tag.slice(0, lastAt), version: tag.slice(lastAt + 1) };
}

function toDateKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export async function fetchReleases(): Promise<ReleaseGroup[]> {
  const raw = await getReleases(3);

  const entries: PackageRelease[] = raw
    .filter((r) => !r.draft && !r.prerelease)
    .flatMap((r) => {
      const parsed = parseTag(r.tag_name);
      if (!parsed) return [];
      return [
        {
          pkg: parsed.pkg,
          version: parsed.version,
          body: linkifyCommits(r.body ?? ""),
          url: r.html_url,
          date: r.published_at,
        },
      ];
    });

  const grouped = new Map<string, PackageRelease[]>();
  for (const entry of entries) {
    const key = toDateKey(entry.date);
    const list = grouped.get(key);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(key, [entry]);
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, releases]) => {
      releases.sort((a, b) => a.pkg.localeCompare(b.pkg));
      return {
        date: releases[0]!.date,
        releases,
      };
    });
}
