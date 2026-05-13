/**
 * Thin GitHub REST API client. Uses the bearer token bound to the current
 * MCP session (extracted in oauth.ts).
 */
const UA = "aui-mcp-showcase";

export type GhRepo = {
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  private: boolean;
  default_branch: string;
  pushed_at: string;
};

export type GhPullRequest = {
  number: number;
  title: string;
  user: { login: string };
  state: "open" | "closed";
  draft: boolean;
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: { name: string; color: string }[];
};

export type GhCommitActivity = {
  /** total commits in week */
  total: number;
  /** Unix timestamp (seconds) for start of week */
  week: number;
  /** Sun..Sat commit counts */
  days: number[];
};

async function gh<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": UA,
      ...init?.headers,
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`GitHub API ${r.status} on ${path}: ${text.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

export async function listUserRepos(
  token: string,
  opts: { sort?: "pushed" | "created" | "full_name"; perPage?: number } = {},
): Promise<GhRepo[]> {
  const sort = opts.sort ?? "pushed";
  const perPage = opts.perPage ?? 30;
  return gh<GhRepo[]>(
    token,
    `/user/repos?sort=${sort}&per_page=${perPage}&affiliation=owner,collaborator,organization_member`,
  );
}

export async function getRepoLanguages(
  token: string,
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  return gh(token, `/repos/${owner}/${repo}/languages`);
}

export async function getCommitActivity(
  token: string,
  owner: string,
  repo: string,
): Promise<GhCommitActivity[]> {
  // GitHub computes this on demand; first call may 202 with empty body.
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": UA,
      },
    },
  );
  if (r.status === 202) return [];
  if (!r.ok) {
    throw new Error(`GitHub API ${r.status} on /stats/commit_activity`);
  }
  return (await r.json()) as GhCommitActivity[];
}

export async function listPullRequests(
  token: string,
  owner: string,
  repo: string,
  opts: { state?: "open" | "closed" | "all"; perPage?: number } = {},
): Promise<GhPullRequest[]> {
  const state = opts.state ?? "open";
  const perPage = opts.perPage ?? 30;
  return gh<GhPullRequest[]>(
    token,
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`,
  );
}
