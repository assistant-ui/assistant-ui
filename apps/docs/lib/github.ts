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

const cacheInit = (
  revalidate: number,
): { cache: "no-store" } | { next: { revalidate: number } } =>
  revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } };

async function ghFetch(
  path: string,
  revalidate: number,
  init?: RequestInit & { headers?: Record<string, string> },
): Promise<Response> {
  const { next: initNext, ...rest } = init ?? {};
  const cache = cacheInit(revalidate);
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: ghHeaders(init?.headers),
    ...("next" in cache
      ? { next: { ...cache.next, ...(initNext ?? {}) } }
      : cache),
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

export async function getRepo(
  revalidate: number = REVALIDATE.WARM,
): Promise<RepoStats | null> {
  try {
    const res = await ghFetch("", revalidate);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.stargazers_count !== "number") return null;
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      watchers: data.subscribers_count,
    };
  } catch {
    return null;
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

export async function getReleases(
  maxPages = 5,
  revalidate: number = REVALIDATE.WARM,
): Promise<GitHubRelease[]> {
  const all: GitHubRelease[] = [];
  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await ghFetch(
        `/releases?per_page=100&page=${page}`,
        revalidate,
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

export async function getCommitActivityStats(
  revalidate: number = REVALIDATE.COOL,
): Promise<CommitActivityWeek[] | null> {
  try {
    const res = await ghFetch("/stats/commit_activity", revalidate);
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
    message?: string;
    author?: { date?: string };
    committer?: { date?: string };
  };
};

export async function getCommitsSince(
  sinceIso: string,
  maxPages = 20,
  revalidate: number = REVALIDATE.COOL,
): Promise<CommitListItem[]> {
  const all: CommitListItem[] = [];
  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await ghFetch(
        `/commits?since=${sinceIso}&per_page=100&page=${page}`,
        revalidate,
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

export type CommitStats = {
  total: number | null;
  firstCommitDate: string | null;
};

const commitDate = (item: CommitListItem | undefined): string | null =>
  item?.commit?.author?.date ?? item?.commit?.committer?.date ?? null;

export async function getCommitStats(
  revalidate: number = REVALIDATE.COOL,
): Promise<CommitStats> {
  try {
    const res = await ghFetch("/commits?per_page=1", revalidate);
    if (!res.ok) return { total: null, firstCommitDate: null };
    // With per_page=1 the last page number equals the total number of commits on the default branch (every author, bots included).
    const last = parseLastPage(res.headers.get("Link"));
    const page1 = (await res.json()) as CommitListItem[];
    const total = last ?? (Array.isArray(page1) ? page1.length : null);

    if (last == null || last <= 1) {
      return { total, firstCommitDate: commitDate(page1[0]) };
    }
    const oldest = await ghFetch(
      `/commits?per_page=1&page=${last}`,
      revalidate,
    );
    if (!oldest.ok) return { total, firstCommitDate: null };
    const data = (await oldest.json()) as CommitListItem[];
    return { total, firstCommitDate: commitDate(data[0]) };
  } catch {
    return { total: null, firstCommitDate: null };
  }
}

export type CoAuthor = {
  name: string;
  email: string;
  id: number | null;
  login: string | null;
  count: number;
};

const CO_AUTHOR_RE = /co-authored-by:\s*([^<\n]+?)\s*<([^>]+)>/gi;
const NOREPLY_RE = /^(?:(\d+)\+)?(.+)@users\.noreply\.github\.com$/i;

const COMMIT_PAGE_CONCURRENCY = 8;
const MAX_COMMIT_PAGES = 60;

export async function getCommitCoAuthors(
  revalidate: number = REVALIDATE.COOL,
): Promise<CoAuthor[] | null> {
  try {
    const first = await ghFetch("/commits?per_page=100&page=1", revalidate);
    if (!first.ok) return null;
    const lastPage = Math.min(
      parseLastPage(first.headers.get("Link")) ?? 1,
      MAX_COMMIT_PAGES,
    );
    const pages: CommitListItem[][] = [
      (await first.json()) as CommitListItem[],
    ];

    const rest: number[] = [];
    for (let page = 2; page <= lastPage; page++) rest.push(page);
    for (let i = 0; i < rest.length; i += COMMIT_PAGE_CONCURRENCY) {
      const batch = await Promise.all(
        rest.slice(i, i + COMMIT_PAGE_CONCURRENCY).map(async (page) => {
          const res = await ghFetch(
            `/commits?per_page=100&page=${page}`,
            revalidate,
          );
          return res.ok ? ((await res.json()) as CommitListItem[]) : [];
        }),
      );
      pages.push(...batch);
    }

    const byEmail = new Map<string, CoAuthor>();
    for (const batch of pages) {
      for (const item of batch) {
        const message = item.commit?.message;
        if (!message) continue;
        for (const match of message.matchAll(CO_AUTHOR_RE)) {
          const name = match[1]!.trim();
          const email = match[2]!.trim().toLowerCase();
          const existing = byEmail.get(email);
          if (existing) {
            existing.count++;
          } else {
            const noreply = email.match(NOREPLY_RE);
            byEmail.set(email, {
              name,
              email,
              id: noreply?.[1] ? Number(noreply[1]) : null,
              login: noreply ? noreply[2]! : null,
              count: 1,
            });
          }
        }
      }
    }
    return Array.from(byEmail.values());
  } catch {
    return null;
  }
}

export type GitHubUser = {
  login: string;
  type: string;
  avatarUrl: string;
  htmlUrl: string;
};

async function fetchGitHubUser(
  path: string,
  revalidate: number,
): Promise<GitHubUser | null> {
  try {
    const res = await fetch(`https://api.github.com/${path}`, {
      headers: ghHeaders(),
      ...cacheInit(revalidate),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.login !== "string") return null;
    return {
      login: data.login,
      type: data.type,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
    };
  } catch {
    return null;
  }
}

export const getUser = (login: string, revalidate: number = REVALIDATE.COOL) =>
  fetchGitHubUser(`users/${encodeURIComponent(login)}`, revalidate);

export const getUserById = (id: number, revalidate: number = REVALIDATE.COOL) =>
  fetchGitHubUser(`user/${id}`, revalidate);

export type GitHubContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type?: string;
};

export async function getContributors(
  maxPages = 2,
  revalidate: number = REVALIDATE.COOL,
): Promise<GitHubContributor[] | null> {
  try {
    const all: GitHubContributor[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await ghFetch(
        `/contributors?per_page=100&page=${page}`,
        revalidate,
      );
      if (!res.ok) {
        if (page === 1) return null;
        break;
      }
      const batch = (await res.json()) as GitHubContributor[];
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  } catch {
    return null;
  }
}

export type StargazerEntry = { starred_at: string };

export async function getStargazersPage(
  page: number,
  revalidate: number = REVALIDATE.COOL,
): Promise<{
  data: StargazerEntry[];
  lastPage: number | null;
}> {
  try {
    const res = await ghFetch(
      `/stargazers?per_page=100&page=${page}`,
      revalidate,
      { headers: { Accept: "application/vnd.github.star+json" } },
    );
    if (!res.ok) return { data: [], lastPage: null };
    const data = (await res.json()) as StargazerEntry[];
    return { data, lastPage: parseLastPage(res.headers.get("Link")) };
  } catch {
    return { data: [], lastPage: null };
  }
}

export async function getDependents(
  revalidate: number = REVALIDATE.COOL,
): Promise<{
  repos: number;
  packages: number;
} | null> {
  try {
    const res = await fetch(`${HTML_BASE}/network/dependents`, {
      headers: { "User-Agent": "Mozilla/5.0 (assistant-ui-traction)" },
      ...cacheInit(revalidate),
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
