import { getRepoStars } from "./github";
import { getWeeklyDownloads } from "./npm";

export const OSS_MONOREPO = "assistant-ui/assistant-ui";

export type OssCategory =
  | "sdk"
  | "libraries"
  | "apps"
  | "primitives"
  | "agents"
  | "infrastructure";

export type OssProject = {
  id: string;
  name: string;
  description: string;
  category: OssCategory;
  repo: string;
  path?: string;
  docs?: string;
  site?: string;
  npm?: string;
  pypi?: string;
  license: string | null;
};

export const OSS_CATEGORIES: Record<
  OssCategory,
  { label: string; description: string }
> = {
  sdk: {
    label: "Core SDK",
    description: "The chat runtime and everything that ships with it.",
  },
  libraries: {
    label: "Libraries",
    description: "Standalone libraries with their own release cycle.",
  },
  apps: {
    label: "Applications",
    description: "Complete products, open sourced end to end.",
  },
  primitives: {
    label: "Primitives",
    description: "Small packages we extracted along the way.",
  },
  agents: {
    label: "Agent tooling",
    description: "What coding agents use to build with assistant-ui.",
  },
  infrastructure: {
    label: "Infrastructure",
    description: "Services that run behind an assistant.",
  },
};

export const OSS_PROJECTS: OssProject[] = [
  {
    id: "assistant-ui",
    name: "assistant-ui",
    description: "TypeScript and React library for AI chat.",
    category: "sdk",
    repo: OSS_MONOREPO,
    docs: "/docs",
    npm: "@assistant-ui/react",
    license: "MIT",
  },
  {
    id: "tap",
    name: "@assistant-ui/tap",
    description: "Zero-dependency reactive primitives.",
    category: "libraries",
    repo: OSS_MONOREPO,
    path: "packages/tap",
    docs: "/tap/docs",
    npm: "@assistant-ui/tap",
    license: "MIT",
  },
  {
    id: "store",
    name: "@assistant-ui/store",
    description: "Tap-based state management.",
    category: "libraries",
    repo: OSS_MONOREPO,
    path: "packages/store",
    docs: "/tap/docs/store/why-store",
    npm: "@assistant-ui/store",
    license: "MIT",
  },
  {
    id: "assistant-stream",
    name: "assistant-stream",
    description: "Streaming utilities for AI assistants.",
    category: "libraries",
    repo: OSS_MONOREPO,
    path: "packages/assistant-stream",
    npm: "assistant-stream",
    pypi: "assistant-stream",
    license: "MIT",
  },
  {
    id: "tool-ui",
    name: "tool-ui",
    description: "UI components for AI interfaces.",
    category: "libraries",
    repo: "assistant-ui/tool-ui",
    site: "https://tool-ui.com",
    license: "MIT",
  },
  {
    id: "xpm",
    name: "@assistant-ui/xpm",
    description: "One command for npm, yarn, pnpm, bun, deno, and uv.",
    category: "libraries",
    repo: "assistant-ui/xpm",
    npm: "@assistant-ui/xpm",
    license: "MIT",
  },
  {
    id: "modelpedia",
    name: "modelpedia",
    description: "Open catalog of AI models across providers.",
    category: "apps",
    repo: "assistant-ui/modelpedia",
    site: "https://modelpedia.dev",
    license: "MIT",
  },
  {
    id: "open-prism",
    name: "open-prism",
    description: "AI LaTeX writing workspace with live preview.",
    category: "apps",
    repo: "assistant-ui/open-prism",
    site: "https://openprism.vercel.app",
    license: "MIT",
  },
  {
    id: "tw-shimmer",
    name: "tw-shimmer",
    description: "Tailwind v4 plugin for shimmer effects.",
    category: "primitives",
    repo: OSS_MONOREPO,
    path: "packages/tw-shimmer",
    site: "/tw-shimmer",
    npm: "tw-shimmer",
    license: "MIT",
  },
  {
    id: "tw-glass",
    name: "tw-glass",
    description: "Tailwind v4 plugin for glass refraction effects.",
    category: "primitives",
    repo: OSS_MONOREPO,
    path: "packages/tw-glass",
    site: "/tw-glass",
    npm: "tw-glass",
    license: "MIT",
  },
  {
    id: "heat-graph",
    name: "heat-graph",
    description: "Headless React components for activity heatmaps.",
    category: "primitives",
    repo: OSS_MONOREPO,
    path: "packages/heat-graph",
    site: "/heat-graph",
    npm: "heat-graph",
    license: "MIT",
  },
  {
    id: "safe-content-frame",
    name: "safe-content-frame",
    description: "Secure iframe rendering for untrusted content.",
    category: "primitives",
    repo: OSS_MONOREPO,
    path: "packages/safe-content-frame",
    site: "/safe-content-frame",
    npm: "safe-content-frame",
    license: "MIT",
  },
  {
    id: "skills",
    name: "skills",
    description: "Agent skills for building AI chat interfaces.",
    category: "agents",
    repo: "assistant-ui/skills",
    license: null,
  },
  {
    id: "mcp-docs-server",
    name: "@assistant-ui/mcp-docs-server",
    description: "MCP server exposing assistant-ui docs.",
    category: "agents",
    repo: OSS_MONOREPO,
    path: "packages/mcp-docs-server",
    npm: "@assistant-ui/mcp-docs-server",
    license: "MIT",
  },
  {
    id: "sync-server",
    name: "assistant-ui-sync-server",
    description: "Resumable streaming proxy for long-running AI tasks.",
    category: "infrastructure",
    repo: "assistant-ui/assistant-ui-sync-server",
    license: null,
  },
];

export function ossRepoUrl(project: OssProject): string {
  return project.path
    ? `https://github.com/${project.repo}/tree/main/${project.path}`
    : `https://github.com/${project.repo}`;
}

export function ossPrimaryUrl(project: OssProject): string {
  return project.docs ?? project.site ?? ossRepoUrl(project);
}

export function ossNpmUrl(pkg: string): string {
  return `https://www.npmjs.com/package/${pkg}`;
}

export type OssStats = {
  stars: Record<string, number>;
  weekly: Record<string, number>;
  totalStars: number;
  totalWeekly: number;
};

export async function fetchOssStats(revalidate?: number): Promise<OssStats> {
  const repos = [
    ...new Set(
      OSS_PROJECTS.filter((project) => !project.path).map(
        (project) => project.repo,
      ),
    ),
  ];
  const packages = [
    ...new Set(
      OSS_PROJECTS.map((project) => project.npm).filter(
        (name): name is string => name !== undefined,
      ),
    ),
  ];

  const [repoEntries, packageEntries] = await Promise.all([
    Promise.all(
      repos.map(
        async (repo) => [repo, await getRepoStars(repo, revalidate)] as const,
      ),
    ),
    Promise.all(
      packages.map(
        async (name) =>
          [name, await getWeeklyDownloads(name, revalidate)] as const,
      ),
    ),
  ]);

  const stars: Record<string, number> = {};
  let totalStars = 0;
  for (const [repo, count] of repoEntries) {
    if (count === null) continue;
    stars[repo] = count;
    totalStars += count;
  }

  const weekly: Record<string, number> = {};
  let totalWeekly = 0;
  for (const [name, count] of packageEntries) {
    if (count === null) continue;
    weekly[name] = count;
    totalWeekly += count;
  }

  return { stars, weekly, totalStars, totalWeekly };
}
