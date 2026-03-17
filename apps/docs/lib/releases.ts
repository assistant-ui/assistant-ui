type GitHubRelease = {
  draft: boolean;
  prerelease: boolean;
  tag_name: string;
  body: string | null;
  html_url: string;
  published_at: string;
};

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

async function fetchAllReleases(): Promise<GitHubRelease[]> {
  const results: GitHubRelease[] = [];

  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://api.github.com/repos/assistant-ui/assistant-ui/releases?per_page=100&page=${page}`,
        { next: { revalidate: 600 } },
      );
      if (!res.ok) break;

      const batch: GitHubRelease[] = await res.json();
      if (batch.length === 0) break;
      results.push(...batch);
    }
  } catch {
    // network error — return whatever we have so far
  }

  return results;
}

export async function fetchReleases(): Promise<ReleaseGroup[]> {
  const raw = await fetchAllReleases();

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
