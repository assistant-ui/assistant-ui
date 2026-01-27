export type PackageRelease = {
  version: string;
  pkg: string;
  body: string;
  url: string;
  date: string;
};

function linkifyCommits(markdown: string) {
  return markdown.replace(
    /\[([a-f0-9]{6,10})\]/gi,
    (_, hash) =>
      `[${hash}](https://github.com/assistant-ui/assistant-ui/commit/${hash})`,
  );
}

function compareVersionsDesc(a: string, b: string) {
  const aParts = a.split(".").map((x) => parseInt(x, 10) || 0);
  const bParts = b.split(".").map((x) => parseInt(x, 10) || 0);

  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const diff = (bParts[i] || 0) - (aParts[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export async function fetchReleases() {
  let page = 1;
  const all: any[] = [];

  // Fetch up to 3 pages (300 releases max)
  while (page <= 3) {
    const res = await fetch(
      `https://api.github.com/repos/assistant-ui/assistant-ui/releases?per_page=100&page=${page}`,
      {
        next: { revalidate: 600 }, // cache 10 minutes
      },
    );

    if (!res.ok) {
      console.error("Failed to fetch releases:", res.status);
      break;
    }

    const batch = await res.json();
    if (batch.length === 0) break;

    all.push(...batch);
    page++;
  }

  const entries: PackageRelease[] = all
    .filter((r) => !r.draft && !r.prerelease)
    .map((r: any) => {
      const tag = r.tag_name;
      const lastAt = tag.lastIndexOf("@");
      if (lastAt <= 0) return null;

      const pkg = tag.slice(0, lastAt);
      const version = tag.slice(lastAt + 1);

      return {
        pkg,
        version,
        body: linkifyCommits(r.body || ""),
        url: r.html_url,
        date: r.published_at,
      };
    })
    .filter(Boolean) as PackageRelease[];

  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const grouped = new Map<string, PackageRelease[]>();

  for (const entry of entries) {
    if (!grouped.has(entry.version)) {
      grouped.set(entry.version, []);
    }
    grouped.get(entry.version)!.push(entry);
  }

  const sorted = Array.from(grouped.entries()).sort(([a], [b]) =>
    compareVersionsDesc(a, b),
  );

  for (const [, list] of sorted) {
    list.sort((a, b) => a.pkg.localeCompare(b.pkg));
  }

  return sorted;
}
