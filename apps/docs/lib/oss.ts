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

export type OssTier = "flagship" | "major" | "minor";

export type OssProject = {
  id: string;
  name: string;
  description: string;
  category: OssCategory;
  tier: OssTier;
  repo: string;
  path?: string;
  docs?: string;
  site?: string;
  npm?: string;
  pypi?: string;
  license: string | null;
};

export type OssDestinationKind = "docs" | "website" | "github" | "npm" | "pypi";

export type OssDestination = {
  kind: OssDestinationKind;
  label: string;
  ariaLabel: string;
  href: string;
  isPrimary: boolean;
};

const OSS_DESTINATION_NAMES: Record<OssDestinationKind, string> = {
  docs: "docs",
  website: "website",
  github: "GitHub",
  npm: "npm",
  pypi: "PyPI",
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
    tier: "flagship",
    repo: OSS_MONOREPO,
    docs: "/docs",
    npm: "@assistant-ui/react",
    license: "MIT",
  },
  {
    id: "safe-content-frame",
    name: "Safe Content Frame",
    description: "Sandboxes for HTML. Built for MCP Apps and Generative UI.",
    category: "primitives",
    tier: "major",
    repo: OSS_MONOREPO,
    path: "packages/safe-content-frame",
    site: "/safe-content-frame",
    npm: "safe-content-frame",
    license: "MIT",
  },
  {
    id: "tap",
    name: "@assistant-ui/tap",
    category: "libraries",
    tier: "major",
    repo: OSS_MONOREPO,
    path: "packages/tap",
    docs: "/docs/tap",
    npm: "@assistant-ui/tap",
    license: "MIT",
  },
  {
    id: "store",
    name: "@assistant-ui/store",
    category: "libraries",
    tier: "minor",
    repo: OSS_MONOREPO,
    path: "packages/store",
    docs: "/docs/store/why-store",
    npm: "@assistant-ui/store",
    license: "MIT",
  },
  {
    id: "assistant-stream",
    name: "assistant-stream",
    category: "libraries",
    tier: "minor",
    repo: OSS_MONOREPO,
    path: "packages/assistant-stream",
    npm: "assistant-stream",
    pypi: "assistant-stream",
    license: "MIT",
  },
  {
    id: "xpm",
    name: "@assistant-ui/xpm",
    description: "One command for npm, yarn, pnpm, bun, deno, and uv.",
    category: "libraries",
    tier: "minor",
    repo: "assistant-ui/xpm",
    npm: "@assistant-ui/xpm",
    license: "MIT",
  },
  {
    id: "modelpedia",
    name: "modelpedia",
    description: "Open catalog of AI models across providers.",
    category: "apps",
    tier: "minor",
    repo: "assistant-ui/modelpedia",
    site: "https://modelpedia.dev",
    license: "MIT",
  },
  {
    id: "open-prism",
    name: "open-prism",
    description: "AI LaTeX writing workspace with live preview.",
    category: "apps",
    tier: "minor",
    repo: "assistant-ui/open-prism",
    site: "https://openprism.vercel.app",
    license: "MIT",
  },
  {
    id: "tw-shimmer",
    name: "tw-shimmer",
    category: "primitives",
    tier: "major",
    repo: OSS_MONOREPO,
    path: "packages/tw-shimmer",
    site: "/tw-shimmer",
    npm: "tw-shimmer",
    license: "MIT",
  },
  {
    id: "heat-graph",
    name: "heat-graph",
    category: "primitives",
    tier: "minor",
    repo: OSS_MONOREPO,
    path: "packages/heat-graph",
    site: "/heat-graph",
    npm: "heat-graph",
    license: "MIT",
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

export function ossPypiUrl(pkg: string): string {
  return `https://pypi.org/project/${pkg}/`;
}

export function ossAbsoluteUrl(url: string, baseUrl: string): string {
  return url.startsWith("http") ? url : baseUrl + url;
}

export function ossDestinations(project: OssProject): OssDestination[] {
  const destinations: {
    kind: OssDestinationKind;
    href: string;
  }[] = [];

  if (project.docs) destinations.push({ kind: "docs", href: project.docs });
  if (project.site) destinations.push({ kind: "website", href: project.site });
  destinations.push({ kind: "github", href: ossRepoUrl(project) });
  if (project.npm)
    destinations.push({ kind: "npm", href: ossNpmUrl(project.npm) });
  if (project.pypi)
    destinations.push({ kind: "pypi", href: ossPypiUrl(project.pypi) });

  const primaryIndex = destinations.findIndex(
    ({ href }) => href === ossPrimaryUrl(project),
  );

  return destinations.map(({ kind, href }, index) => ({
    kind,
    label: kind,
    ariaLabel: `${project.name} on ${OSS_DESTINATION_NAMES[kind]}`,
    href,
    isPrimary: index === primaryIndex,
  }));
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
