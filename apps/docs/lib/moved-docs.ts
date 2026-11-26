// Docs pages that moved or merged when the docs were reorganized. Published
// links and the markdown urls agents fetch keep resolving through this map.
// A destination may carry a #fragment when the old page became one section of
// another.
export const MOVED_DOCS_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["/docs/runtimes/concepts/architecture", "/docs/concepts/runtime"],
  ["/docs/runtimes/concepts/threads", "/docs/concepts/threads"],
  ["/docs/runtimes/concepts/adapters", "/docs/concepts/adapters"],
  ["/docs/runtimes/concepts/stability", "/docs/migrations/stability"],
  ["/docs/guides/context-api", "/docs/concepts/context-api"],
];

const withoutFragment = (path: string) => path.split("#")[0]!;

// Markdown variants come first so the plain page redirect cannot claim them.
export const MOVED_DOCS_REDIRECTS = MOVED_DOCS_PATHS.flatMap(([from, to]) =>
  [
    { source: `${from}.md`, destination: `${withoutFragment(to)}.md` },
    { source: `${from}.mdx`, destination: `${withoutFragment(to)}.md` },
    { source: from, destination: to },
  ].map((redirect) => ({ ...redirect, permanent: true })),
);
