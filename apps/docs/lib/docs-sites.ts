type SubProject = {
  title: string;
  description: string;
  path: string;
  metadataTitle?: string;
  productLabel?: string;
  productDescription: string;
  oss?: {
    name?: string;
    description?: string;
    tier: "major" | "minor";
    npm: string;
    footerOrder: number;
    placement: "top" | "bottom";
  };
};

export const SUB_PROJECT_REGISTRY = {
  "tw-shimmer": {
    title: "tw-shimmer",
    description:
      "Zero-dependency Tailwind v4 shimmer for text and skeleton loaders. Pure CSS.",
    path: "packages/tw-shimmer",
    metadataTitle: "tw-shimmer by assistant-ui",
    productDescription: "Tailwind CSS shimmer effects",
    oss: {
      tier: "major",
      npm: "tw-shimmer",
      footerOrder: 0,
      placement: "bottom",
    },
  },
  "safe-content-frame": {
    title: "Safe Content Frame",
    description:
      "Sandboxes for HTML. Render MCP Apps and Generative UI in isolated iframes with their own origins.",
    path: "packages/safe-content-frame",
    productDescription: "Sandboxes for HTML",
    oss: {
      description: "Sandboxes for HTML. Built for MCP Apps and Generative UI.",
      tier: "major",
      npm: "safe-content-frame",
      footerOrder: 2,
      placement: "top",
    },
  },
  "generative-frame": {
    title: "Generative Frame",
    description:
      "Render model-written HTML and SVG widgets as they stream, each in a sandboxed frame on its own domain.",
    path: "packages/generative-frame",
    productDescription: "Streaming widgets from model output",
    oss: {
      description:
        "Stream model-written HTML and SVG widgets into sandboxed frames.",
      tier: "major",
      npm: "generative-frame",
      footerOrder: 3,
      placement: "top",
    },
  },
  native: {
    title: "assistant-ui for React Native",
    description:
      "Native Thread, Composer, and Message primitives for Expo. Same runtime as the web SDK.",
    path: "packages/react-native",
    productLabel: "React Native",
    productDescription: "Build mobile apps with React Native",
  },
  ink: {
    title: "assistant-ui for the Terminal",
    description:
      "Terminal Thread, Composer, and Message primitives for Ink. Same runtime as the web SDK. ANSI markdown.",
    path: "packages/react-ink",
    productLabel: "Ink",
    productDescription: "Build interactive experiences with Ink",
  },
  "heat-graph": {
    title: "Heat Graph",
    description:
      "Headless, composable activity heatmap components for React. Radix-style primitives you fully control.",
    path: "packages/heat-graph",
    productDescription: "Activity heatmap graph components",
    oss: {
      name: "heat-graph",
      tier: "minor",
      npm: "heat-graph",
      footerOrder: 1,
      placement: "bottom",
    },
  },
  "react-o11y": {
    title: "react-o11y",
    description:
      "Headless, composable observability span primitives for React. Render agent traces, sub-agent trees, and run timelines as collapsible waterfalls you fully control.",
    path: "packages/react-o11y",
    productDescription: "Observability span primitives",
    oss: {
      tier: "minor",
      npm: "@assistant-ui/react-o11y",
      footerOrder: 4,
      placement: "bottom",
    },
  },
  playground: {
    title: "Playground",
    description:
      "Experiment with different configurations and settings using the Assistant UI Playground.",
    path: "apps/docs/app/(demos)/playground",
    productDescription: "Interactive playground",
  },
  learn: {
    title: "Learn",
    metadataTitle: "Learn assistant-ui",
    description:
      "Build assistant interfaces through a guided course in the Xulux playground.",
    path: "apps/docs/lib/xulux/learn",
    productDescription: "Guided assistant-ui courses",
  },
} as const satisfies Record<string, SubProject>;

export type SubProjectSlug = keyof typeof SUB_PROJECT_REGISTRY;
export const SUB_PROJECT_SLUGS = Object.keys(
  SUB_PROJECT_REGISTRY,
) as SubProjectSlug[];

export function subProject<S extends SubProjectSlug>(
  slug: S,
): SubProject & (typeof SUB_PROJECT_REGISTRY)[S] {
  return SUB_PROJECT_REGISTRY[slug];
}

export function subProjectGithubUrl(slug: SubProjectSlug): string {
  return `https://github.com/assistant-ui/assistant-ui/tree/main/${subProject(slug).path}`;
}

// A sub-project with its own docs site at /<id>/docs, built from
// content/docs-sites/<id>. `legacy` maps a path the site's pages used to live
// at onto its new url, so published links and MCP resource paths keep
// resolving.
export const DOCS_SITES = (
  ["safe-content-frame", "generative-frame"] as const
).map((id) => ({
  id,
  title: subProject(id).title,
  landing: `/${id}`,
  github: subProjectGithubUrl(id),
  legacy: [] as ReadonlyArray<readonly [string, string]>,
}));

export type DocsSite = (typeof DOCS_SITES)[number];
export type DocsSiteId = DocsSite["id"];

export function getDocsSite(id: string): DocsSite | undefined {
  return DOCS_SITES.find((site) => site.id === id);
}

export function docsSiteBaseUrl(id: DocsSiteId): string {
  return `/${id}/docs`;
}

const LEGACY_DOCS_SITE_PATHS: ReadonlyArray<readonly [string, string]> =
  DOCS_SITES.flatMap((site) => site.legacy);

export function rewriteLegacyDocsSitePath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  for (const [from, to] of LEGACY_DOCS_SITE_PATHS) {
    if (normalized === from) return to;
    if (normalized.startsWith(`${from}/`)) {
      return `${to}${normalized.slice(from.length)}`;
    }
  }
  return null;
}

// Markdown variants come before the plain path because Next applies the first
// matching redirect.
export const DOCS_SITE_REDIRECTS = LEGACY_DOCS_SITE_PATHS.flatMap(
  ([from, to]) =>
    [
      { source: `${from}.md`, destination: `${to}.md` },
      { source: `${from}.mdx`, destination: `${to}.md` },
      { source: from, destination: to },
    ].map((redirect) => ({ ...redirect, permanent: true })),
);

const MARKDOWN_ACCEPT = {
  type: "header" as const,
  key: "accept",
  value: "(?:.*text/markdown.*)",
};

export const docsSiteMarkdownFileRewrites = () =>
  DOCS_SITES.flatMap(({ id }) => {
    const base = docsSiteBaseUrl(id);
    const destination = `/site-llms.mdx/${id}`;
    return [
      { source: `${base}.md`, destination },
      { source: `${base}.mdx`, destination },
      { source: `${base}/:path*.md`, destination: `${destination}/:path*` },
      { source: `${base}/:path*.mdx`, destination: `${destination}/:path*` },
    ];
  });

export const docsSiteMarkdownAcceptRewrites = () =>
  DOCS_SITES.map(({ id }) => ({
    source: `${docsSiteBaseUrl(id)}/:path*`,
    has: [MARKDOWN_ACCEPT],
    destination: `/site-llms.mdx/${id}/:path*`,
  }));
