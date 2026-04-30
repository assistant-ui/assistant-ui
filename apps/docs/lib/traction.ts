import {
  getCommitActivityStats,
  getCommitsSince,
  getContributors,
  getReleases,
  getStargazersPage,
} from "./github";
import { getDownloadsLastYear, getDownloadsRange } from "./npm";

export type PackageInfo = {
  name: string;
  description: string;
  category: PackageCategory;
};

export type PackageCategory =
  | "core"
  | "tooling"
  | "cloud"
  | "frameworks"
  | "protocols"
  | "platforms"
  | "ui"
  | "effects"
  | "mcp"
  | "observability";

export const PACKAGE_CATEGORIES: Record<
  PackageCategory,
  { label: string; description: string }
> = {
  core: {
    label: "Core",
    description: "Runtime primitives every distribution shares.",
  },
  tooling: {
    label: "Tooling & CLI",
    description: "Scaffolding and build tooling.",
  },
  cloud: {
    label: "Cloud & streaming",
    description: "Hosted persistence and stream transports.",
  },
  frameworks: {
    label: "Framework adapters",
    description: "Drop-in bindings for popular AI SDKs.",
  },
  protocols: {
    label: "Protocol adapters",
    description: "Open agent protocols, ready to wire up.",
  },
  platforms: {
    label: "Platform bindings",
    description: "Run anywhere React runs.",
  },
  ui: {
    label: "UI & rendering",
    description: "Markdown, rich composers, and devtools.",
  },
  effects: {
    label: "Effects & primitives",
    description: "Standalone packages we built along the way.",
  },
  mcp: {
    label: "MCP & agents",
    description: "Tooling for MCP hosts and agent runtimes.",
  },
  observability: {
    label: "Observability",
    description: "Trace, debug, and measure assistants.",
  },
};

export const PACKAGES: PackageInfo[] = [
  {
    name: "@assistant-ui/react",
    description: "TypeScript/React library for AI chat.",
    category: "core",
  },
  {
    name: "@assistant-ui/core",
    description: "Framework-agnostic core runtime.",
    category: "core",
  },
  {
    name: "@assistant-ui/store",
    description: "Tap-based state management.",
    category: "core",
  },
  {
    name: "@assistant-ui/tap",
    description: "Zero-dependency reactive primitives.",
    category: "core",
  },
  {
    name: "assistant-ui",
    description: "CLI for assistant-ui.",
    category: "tooling",
  },
  {
    name: "create-assistant-ui",
    description: "Scaffold an assistant-ui app in one command.",
    category: "tooling",
  },
  {
    name: "@assistant-ui/x-buildutils",
    description: "Shared build utilities for the monorepo.",
    category: "tooling",
  },
  {
    name: "assistant-cloud",
    description: "Hosted backend for assistant-ui.",
    category: "cloud",
  },
  {
    name: "assistant-stream",
    description: "Streaming utilities for AI assistants.",
    category: "cloud",
  },
  {
    name: "@assistant-ui/cloud-ai-sdk",
    description: "AI SDK hooks with assistant-cloud persistence.",
    category: "cloud",
  },
  {
    name: "@assistant-ui/react-ai-sdk",
    description: "Vercel AI SDK adapter.",
    category: "frameworks",
  },
  {
    name: "@assistant-ui/react-langgraph",
    description: "LangGraph adapter.",
    category: "frameworks",
  },
  {
    name: "@assistant-ui/react-langchain",
    description: "LangChain useStream adapter.",
    category: "frameworks",
  },
  {
    name: "@assistant-ui/react-google-adk",
    description: "Google ADK adapter.",
    category: "frameworks",
  },
  {
    name: "@assistant-ui/react-opencode",
    description: "OpenCode runtime adapter.",
    category: "frameworks",
  },
  {
    name: "@assistant-ui/react-a2a",
    description: "A2A v1.0 agent-to-agent protocol adapter.",
    category: "protocols",
  },
  {
    name: "@assistant-ui/react-ag-ui",
    description: "AG-UI protocol adapter.",
    category: "protocols",
  },
  {
    name: "@assistant-ui/react-data-stream",
    description: "Generic data stream adapter.",
    category: "protocols",
  },
  {
    name: "@assistant-ui/react-native",
    description: "React Native bindings.",
    category: "platforms",
  },
  {
    name: "@assistant-ui/react-ink",
    description: "Terminal UI bindings via Ink.",
    category: "platforms",
  },
  {
    name: "@assistant-ui/react-markdown",
    description: "Streaming-aware markdown renderer.",
    category: "ui",
  },
  {
    name: "@assistant-ui/react-streamdown",
    description: "Streamdown-based markdown rendering.",
    category: "ui",
  },
  {
    name: "@assistant-ui/react-syntax-highlighter",
    description: "Syntax highlighting for assistant-ui.",
    category: "ui",
  },
  {
    name: "@assistant-ui/react-ink-markdown",
    description: "Markdown for the terminal distribution.",
    category: "ui",
  },
  {
    name: "@assistant-ui/react-lexical",
    description: "Lexical composer with @-mention support.",
    category: "ui",
  },
  {
    name: "@assistant-ui/react-hook-form",
    description: "React Hook Form integration.",
    category: "ui",
  },
  {
    name: "@assistant-ui/react-devtools",
    description: "Inspect runtime state in the browser.",
    category: "ui",
  },
  {
    name: "tw-glass",
    description: "Tailwind v4 plugin for glass refraction effects.",
    category: "effects",
  },
  {
    name: "tw-shimmer",
    description: "Tailwind v4 plugin for shimmer effects.",
    category: "effects",
  },
  {
    name: "heat-graph",
    description: "Headless React components for activity heatmaps.",
    category: "effects",
  },
  {
    name: "safe-content-frame",
    description: "Secure iframe rendering for untrusted content.",
    category: "effects",
  },
  {
    name: "mcp-app-studio",
    description: "Build interactive apps for MCP hosts.",
    category: "mcp",
  },
  {
    name: "@assistant-ui/mcp-docs-server",
    description: "MCP server exposing assistant-ui docs.",
    category: "mcp",
  },
  {
    name: "@assistant-ui/agent-launcher",
    description: "Launch Claude Code with bundled plugins.",
    category: "mcp",
  },
  {
    name: "@assistant-ui/react-o11y",
    description: "Observability primitives for assistants.",
    category: "observability",
  },
];

export type PackageDownloads = {
  weekly: number;
  series: number[];
  monthly: number;
  prevMonthly: number;
};

export type NpmDownloads = {
  totalWeekly: number;
  perPackage: Record<string, PackageDownloads>;
};

export type TimelinePoint = {
  date: string;
  value: number;
};

export type Contributor = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
};

export type ActivityPoint = {
  date: string;
  count: number;
};

export async function fetchCommitActivity(): Promise<ActivityPoint[]> {
  const stats = await getCommitActivityStats();
  if (stats && stats.length > 0) {
    const points: ActivityPoint[] = [];
    for (const week of stats) {
      for (let i = 0; i < 7; i++) {
        const ms = (week.week + i * 86_400) * 1000;
        const d = new Date(ms);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        points.push({ date: `${y}-${m}-${day}`, count: week.days[i] ?? 0 });
      }
    }
    return points;
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 365);
  const items = await getCommitsSince(since.toISOString());

  const counts = new Map<string, number>();
  for (const c of items) {
    const iso = c.commit?.author?.date ?? c.commit?.committer?.date;
    if (!iso) continue;
    const day = iso.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export async function fetchReleaseActivity(): Promise<ActivityPoint[]> {
  const cutoff = Date.now() - 365 * 86_400_000;
  const releases = await getReleases();

  const counts = new Map<string, number>();
  for (const r of releases) {
    const iso = r.published_at ?? r.created_at;
    if (new Date(iso).getTime() < cutoff) continue;
    const day = iso.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export async function fetchContributors(): Promise<Contributor[]> {
  const raw = await getContributors();
  return raw
    .filter((c) => c.type !== "Bot" && !/\[bot\]$/i.test(c.login))
    .map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      htmlUrl: c.html_url,
      contributions: c.contributions,
    }));
}

const EMPTY_DOWNLOADS: PackageDownloads = {
  weekly: 0,
  series: [],
  monthly: 0,
  prevMonthly: 0,
};

const sum = (arr: number[]) => arr.reduce((acc, n) => acc + n, 0);

async function fetchPackageDownloadRange(
  name: string,
): Promise<PackageDownloads> {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - 60);
  const startStr = start.toISOString().slice(0, 10);

  const downloads = await getDownloadsRange(name, startStr, end);
  const all = downloads.map((d) => d.downloads);
  if (all.length === 0) return EMPTY_DOWNLOADS;

  const last60 = all.slice(-60);
  const last30 = last60.slice(-30);
  const prior30 = last60.slice(-60, -30);
  const last7 = last60.slice(-7);

  return {
    weekly: sum(last7),
    series: last30,
    monthly: sum(last30),
    prevMonthly: sum(prior30),
  };
}

export async function fetchNpmDownloads(): Promise<NpmDownloads> {
  const entries = await Promise.all(
    PACKAGES.map(
      async (pkg) =>
        [pkg.name, await fetchPackageDownloadRange(pkg.name)] as const,
    ),
  );
  const perPackage: Record<string, PackageDownloads> = {};
  let totalWeekly = 0;
  for (const [name, downloads] of entries) {
    perPackage[name] = downloads;
    totalWeekly += downloads.weekly;
  }
  return { totalWeekly, perPackage };
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export const TIMELINE_PACKAGES = [
  "@assistant-ui/react",
  "@assistant-ui/react-ai-sdk",
  "@assistant-ui/react-markdown",
  "@assistant-ui/react-langgraph",
  "assistant-stream",
] as const;

export type TimelineSeries = {
  series: {
    key: string;
    pkg: string;
    label: string;
    chartIndex: number;
  }[];
  data: { date: string; [key: string]: number | string }[];
  projectedMonth?: string;
};

export async function fetchTimelineSeries(
  packages: readonly string[],
): Promise<TimelineSeries> {
  const fetched = await Promise.all(
    packages.map(async (pkg, idx) => ({
      key: `s${idx}`,
      pkg,
      label: pkg.replace(/^@assistant-ui\//, "").replace(/^assistant-/, ""),
      chartIndex: (idx % 5) + 1,
      points: await fetchDownloadsTimeline(pkg),
    })),
  );

  const monthsSet = new Set<string>();
  for (const { points } of fetched) {
    for (const p of points) monthsSet.add(p.date);
  }
  const months = Array.from(monthsSet).sort();

  const cutoff = currentMonthKey();
  const data = months.map((date) => {
    const isProjected = date === cutoff;
    const row: { date: string; [key: string]: number | string } = { date };
    for (const { key, points } of fetched) {
      const point = points.find((p) => p.date === date);
      const value = point?.value ?? 0;
      if (!isProjected) row[key] = value;
    }
    return row;
  });

  const projectedIndex = data.findIndex((r) => r.date === cutoff);
  if (projectedIndex >= 1) {
    for (let idx = projectedIndex - 1; idx <= projectedIndex; idx++) {
      const row = data[idx]!;
      const rowDate = row.date as string;
      for (const { key, points } of fetched) {
        const val = points.find((p) => p.date === rowDate)?.value ?? 0;
        row[`${key}_proj`] = val;
      }
    }
  }

  const series = fetched.map(({ key, pkg, label, chartIndex }) => ({
    key,
    pkg,
    label,
    chartIndex,
  }));

  return {
    series,
    data,
    ...(projectedIndex >= 0 ? { projectedMonth: cutoff } : {}),
  };
}

export async function fetchDownloadsTimeline(
  name: string,
): Promise<TimelinePoint[]> {
  const downloads = await getDownloadsLastYear(name);
  if (!downloads.length) return [];
  const cutoff = currentMonthKey();
  type MonthBucket = {
    sum: number;
    dailies: { day: string; downloads: number }[];
  };
  const byMonth = new Map<string, MonthBucket>();
  for (const point of downloads) {
    const month = point.day.slice(0, 7);
    const entry = byMonth.get(month) ?? { sum: 0, dailies: [] };
    entry.sum += point.downloads;
    entry.dailies.push({ day: point.day, downloads: point.downloads });
    byMonth.set(month, entry);
  }
  const sorted = Array.from(byMonth.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const fullMonths = sorted.filter(([k]) => k !== cutoff);
  const lastFullMonth = fullMonths[fullMonths.length - 1];
  const priorFullMonth = fullMonths[fullMonths.length - 2];

  return sorted.map(([date, bucket]) => {
    if (date !== cutoff || bucket.dailies.length === 0) {
      return { date, value: bucket.sum };
    }
    return {
      date,
      value: projectInflightMonth(
        date,
        bucket,
        lastFullMonth?.[1].sum,
        priorFullMonth?.[1].sum,
      ),
    };
  });
}

function projectInflightMonth(
  date: string,
  bucket: { sum: number; dailies: { day: string; downloads: number }[] },
  lastFullMonthSum: number | undefined,
  priorFullMonthSum: number | undefined,
): number {
  // npm aggregation lags 1-2 days; trailing days under-report and would drag the daily average down.
  const TRAILING_LAG_DAYS = 2;
  const dailies = [...bucket.dailies].sort((a, b) =>
    a.day.localeCompare(b.day),
  );
  const stable = dailies.slice(
    0,
    Math.max(1, dailies.length - TRAILING_LAG_DAYS),
  );
  const stableSum = stable.reduce((s, d) => s + d.downloads, 0);
  const stableDays = stable.length;

  const totalDays = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)),
    0,
  ).getDate();

  const linear = (stableSum / stableDays) * totalDays;

  if (!lastFullMonthSum || !priorFullMonthSum || priorFullMonthSum === 0) {
    return Math.round(linear);
  }

  // cap growth so an outlier month doesn't produce a runaway projection.
  const growth = Math.max(
    -0.3,
    Math.min(1.0, lastFullMonthSum / priorFullMonthSum - 1),
  );
  const trend = lastFullMonthSum * (1 + growth);
  // early in the month trust the trend (little data); late, trust observed.
  const elapsedFraction = stableDays / totalDays;
  const blended = elapsedFraction * linear + (1 - elapsedFraction) * trend;

  return Math.round(blended);
}

export async function fetchStarHistory(
  totalStars: number,
): Promise<TimelinePoint[]> {
  try {
    const first = await getStargazersPage(1);
    if (first.data.length === 0) return [];

    const lastPage = first.lastPage ?? Math.max(1, Math.ceil(totalStars / 100));

    const samples = new Set<number>([1, lastPage]);
    const target = 12;
    if (lastPage > 2) {
      const step = (lastPage - 1) / (target - 1);
      for (let i = 1; i < target - 1; i++) {
        samples.add(Math.max(2, Math.round(1 + i * step)));
      }
    }
    const pages = Array.from(samples)
      .filter((p) => p >= 1 && p <= lastPage)
      .sort((a, b) => a - b);

    const fetched = await Promise.all(
      pages.map(async (page) => {
        if (page === 1) return { page, data: first.data };
        const result = await getStargazersPage(page);
        return { page, data: result.data };
      }),
    );

    const anchors: TimelinePoint[] = fetched
      .filter(({ data }) => data.length > 0)
      .map(({ page, data }) => ({
        date: data[0]!.starred_at,
        value: (page - 1) * 100 + 1,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((p, i, arr) => i === 0 || p.value > arr[i - 1]!.value);

    // page sampling stops at the first star on the last page; append (now, totalStars) so the chart reaches today.
    const now = new Date().toISOString();
    const lastAnchor = anchors[anchors.length - 1];
    if (
      !lastAnchor ||
      (totalStars > lastAnchor.value && now > lastAnchor.date)
    ) {
      anchors.push({ date: now, value: totalStars });
    }

    if (anchors.length < 2) return anchors;

    return resampleMonthly(anchors);
  } catch {
    return [];
  }
}

// page-based sampling clusters unevenly in time; resample on a monthly grid so the chart shows real acceleration, not straight segments.
function resampleMonthly(anchors: TimelinePoint[]): TimelinePoint[] {
  const startMs = new Date(anchors[0]!.date).getTime();
  const endAnchor = anchors[anchors.length - 1]!;
  const endMs = new Date(endAnchor.date).getTime();

  const startDate = new Date(startMs);
  const cursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1),
  );

  const out: TimelinePoint[] = [
    { date: anchors[0]!.date, value: anchors[0]!.value },
  ];

  let i = 0;
  while (cursor.getTime() <= endMs) {
    const t = cursor.getTime();
    while (
      i < anchors.length - 1 &&
      new Date(anchors[i + 1]!.date).getTime() < t
    ) {
      i++;
    }
    const a = anchors[i]!;
    const b = anchors[Math.min(i + 1, anchors.length - 1)]!;
    const aT = new Date(a.date).getTime();
    const bT = new Date(b.date).getTime();
    const ratio =
      bT === aT ? 0 : Math.min(1, Math.max(0, (t - aT) / (bT - aT)));
    const value = Math.round(a.value + (b.value - a.value) * ratio);
    out.push({ date: cursor.toISOString(), value });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  // tail point so the line reaches today instead of the latest crossed month boundary.
  const tailExisting = out[out.length - 1]!;
  if (
    new Date(endAnchor.date).getTime() > new Date(tailExisting.date).getTime()
  ) {
    out.push(endAnchor);
  }

  return out;
}

export const PROJECT_FACTS = {
  firstCommitDate: "2024-04-21",
  totalCommits: 3062,
  uniqueAuthors: 100,
  publicPackages: PACKAGES.length,
  examples: 30,
  showcased: 8,
} as const;

export function daysSince(isoDate: string): number {
  const start = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}
