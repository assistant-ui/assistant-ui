import "server-only";

const REPO = "assistant-ui/assistant-ui";
const API_BASE = `https://api.github.com/repos/${REPO}`;
const HTML_BASE = `https://github.com/${REPO}`;

export const REVALIDATE = {
  WARM: 3600,
  COOL: 21_600,
} as const;

const USER_AGENT = "assistant-ui-docs";

function ghHeaders(extra?: HeadersInit): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra as Record<string, string>)) {
      h[k] = v;
    }
  }
  return h;
}

async function ghFetch(
  path: string,
  revalidate: number,
  init?: RequestInit & { headers?: Record<string, string> },
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: ghHeaders(init?.headers),
    next: { revalidate, ...(init?.next ?? {}) },
  });
}

function parseLastPage(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return match ? Number(match[1]) : null;
}

export type RepoStats = {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
};

const REPO_FALLBACK: RepoStats = {
  stars: 9700,
  forks: 990,
  openIssues: 60,
  watchers: 80,
};

export async function getRepo(): Promise<RepoStats> {
  try {
    const res = await ghFetch("", REVALIDATE.WARM);
    if (!res.ok) return REPO_FALLBACK;
    const data = await res.json();
    return {
      stars: data.stargazers_count ?? REPO_FALLBACK.stars,
      forks: data.forks_count ?? REPO_FALLBACK.forks,
      openIssues: data.open_issues_count ?? REPO_FALLBACK.openIssues,
      watchers: data.subscribers_count ?? REPO_FALLBACK.watchers,
    };
  } catch {
    return REPO_FALLBACK;
  }
}

export type GitHubRelease = {
  draft: boolean;
  prerelease: boolean;
  tag_name: string;
  body: string | null;
  html_url: string;
  published_at: string;
  created_at: string;
};

export async function getReleases(maxPages = 5): Promise<GitHubRelease[]> {
  const all: GitHubRelease[] = [];
  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await ghFetch(
        `/releases?per_page=100&page=${page}`,
        REVALIDATE.WARM,
      );
      if (!res.ok) break;
      const batch = (await res.json()) as GitHubRelease[];
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 100) break;
    }
  } catch {}
  return all;
}

export type CommitActivityWeek = {
  days: number[];
  total: number;
  week: number;
};

export async function getCommitActivityStats(): Promise<
  CommitActivityWeek[] | null
> {
  try {
    const res = await ghFetch("/stats/commit_activity", REVALIDATE.COOL);
    // 202 means GitHub is still computing; caller falls back to commit list.
    if (!res.ok || res.status === 202) return null;
    const data = (await res.json()) as CommitActivityWeek[];
    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

export type CommitListItem = {
  commit?: {
    author?: { date?: string };
    committer?: { date?: string };
  };
};

export async function getCommitsSince(
  sinceIso: string,
  maxPages = 20,
): Promise<CommitListItem[]> {
  const all: CommitListItem[] = [];
  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await ghFetch(
        `/commits?since=${sinceIso}&per_page=100&page=${page}`,
        REVALIDATE.COOL,
      );
      if (!res.ok) break;
      const batch = (await res.json()) as CommitListItem[];
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 100) break;
    }
  } catch {}
  return all;
}

export type GitHubContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type?: string;
};

export async function getContributors(
  maxPages = 2,
): Promise<GitHubContributor[]> {
  const all: GitHubContributor[] = [];
  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await ghFetch(
        `/contributors?per_page=100&page=${page}`,
        REVALIDATE.COOL,
      );
      if (!res.ok) break;
      const batch = (await res.json()) as GitHubContributor[];
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 100) break;
    }
  } catch {}
  return all;
}

export type StargazerEntry = { starred_at: string };

export async function getStargazersPage(page: number): Promise<{
  data: StargazerEntry[];
  lastPage: number | null;
}> {
  try {
    const res = await ghFetch(
      `/stargazers?per_page=100&page=${page}`,
      REVALIDATE.COOL,
      { headers: { Accept: "application/vnd.github.star+json" } },
    );
    if (!res.ok) return { data: [], lastPage: null };
    const data = (await res.json()) as StargazerEntry[];
    return { data, lastPage: parseLastPage(res.headers.get("Link")) };
  } catch {
    return { data: [], lastPage: null };
  }
}

export async function getDependents(): Promise<{
  repos: number;
  packages: number;
} | null> {
  try {
    const res = await fetch(`${HTML_BASE}/network/dependents`, {
      headers: { "User-Agent": "Mozilla/5.0 (assistant-ui-traction)" },
      next: { revalidate: REVALIDATE.COOL },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const reposMatch = html.match(/([\d,]+)\s+Repositories\b/);
    const packagesMatch = html.match(/([\d,]+)\s+Packages\b/);
    if (!reposMatch && !packagesMatch) return null;
    return {
      repos: reposMatch ? Number(reposMatch[1]!.replace(/,/g, "")) : 0,
      packages: packagesMatch ? Number(packagesMatch[1]!.replace(/,/g, "")) : 0,
    };
  } catch {
    return null;
  }
}
