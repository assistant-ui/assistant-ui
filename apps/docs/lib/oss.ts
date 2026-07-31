import { REVALIDATE, getRepo } from "./github";
import { NPM_REVALIDATE, getWeeklyDownloads } from "./npm";
import { PACKAGES } from "./traction";

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

type OssProjectInput = Omit<OssProject, "description"> & {
  description?: string;
};

const OSS_PROJECT_INPUTS: OssProjectInput[] = [
  {
    id: "assistant-ui",
    name: "assistant-ui",
    category: "sdk",
    repo: OSS_MONOREPO,
    docs: "/docs",
    npm: "@assistant-ui/react",
    license: "MIT",
  },
  {
    id: "tap",
    name: "@assistant-ui/tap",
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

function describe(project: OssProjectInput): string {
  if (project.description) return project.description;
  const pkg = PACKAGES.find((entry) => entry.name === project.npm);
  if (!pkg) {
    throw new Error(
      `OSS project "${project.id}" has no description and no matching package in PACKAGES.`,
    );
  }
  return pkg.description;
}

export const OSS_PROJECTS: OssProject[] = OSS_PROJECT_INPUTS.map((project) => ({
  ...project,
  description: describe(project),
}));

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
};

export async function fetchOssStats(): Promise<OssStats> {
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
        async (repo) =>
          [
            repo,
            (await getRepo(REVALIDATE.WARM, repo))?.stars ?? null,
          ] as const,
      ),
    ),
    Promise.all(
      packages.map(
        async (name) =>
          [name, await getWeeklyDownloads(name, NPM_REVALIDATE.WARM)] as const,
      ),
    ),
  ]);

  const stars: Record<string, number> = {};
  for (const [repo, count] of repoEntries) {
    if (count === null) continue;
    stars[repo] = count;
  }

  const weekly: Record<string, number> = {};
  for (const [name, count] of packageEntries) {
    if (count === null) continue;
    weekly[name] = count;
  }

  return { stars, weekly };
}
