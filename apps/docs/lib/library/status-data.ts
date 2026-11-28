/** Whether a library item should stay on show: a note for the people who keep the library, not a fact about the item's code. */
export type LibraryStatus =
  | "live"
  | "experimental"
  | "unreleased"
  | "internal"
  | "review"
  | "deprecated";

export const LIBRARY_STATUS_LABEL: Record<LibraryStatus, string> = {
  live: "Live",
  experimental: "Experimental",
  unreleased: "Unreleased",
  internal: "Internal",
  review: "Review",
  deprecated: "Deprecated",
};

/** What each status asks for. */
export const LIBRARY_STATUS_MEANING: Record<LibraryStatus, string> = {
  live: "Keep it on show.",
  experimental: "Keep it, marked as early.",
  unreleased: "Hide it until its package is on npm.",
  internal: "Hide it: it is not something to start a project from.",
  review: "A person should decide whether it stays.",
  deprecated: "Remove it.",
};

type StatusNote = { status: LibraryStatus; why: string };

const UNPUBLISHED = (name: string): StatusNote => ({
  status: "unreleased",
  why: `It needs ${name}, which is not published to npm yet, so it only runs inside the repository.`,
});

const TEMPORARY_HOST: StatusNote = {
  status: "review",
  why: "It runs on a temporary preview address, and its code is not in the repository.",
};

// Every item not listed here is live. Keys are ids in the saved panel.
const NOT_LIVE: Record<string, StatusNote> = {
  "examples/with-opencode": {
    status: "experimental",
    why: "Its README calls the integration experimental.",
  },
  "examples/with-pi": {
    status: "experimental",
    why: "The Pi adapter is at 0.0.x, and the README calls this a minimal local harness.",
  },
  "examples/with-webmcp": {
    status: "experimental",
    why: "It uses an unstable API, and WebMCP needs a browser flag turned on.",
  },
  "examples/with-vue": {
    status: "experimental",
    why: "The Vue package is at 0.0.x, and the example has no README.",
  },
  "examples/with-nuxt": {
    status: "experimental",
    why: "It is built on the Vue package, which is at 0.0.x.",
  },
  "examples/with-svelte": UNPUBLISHED("@assistant-ui/svelte"),
  "examples/with-sveltekit": UNPUBLISHED("@assistant-ui/svelte"),
  "examples/with-solid": UNPUBLISHED("@assistant-ui/solid"),
  "examples/with-solid-start": UNPUBLISHED("@assistant-ui/solid"),
  "examples/with-flue": UNPUBLISHED("@assistant-ui/flue"),
  "examples/with-vscode": {
    status: "internal",
    why: "Its README calls it a private test bed for the VS Code package. The VS Code template is the one to start from.",
  },
  "examples/with-mcp": {
    status: "internal",
    why: "Its README calls it a harness for react-mcp. The MCP template is the one to start from.",
  },
  "examples/with-react-ink-web": {
    status: "internal",
    why: "It is the app behind the Ink demo on the site.",
  },
  "examples/with-store": {
    status: "internal",
    why: "It shows the store package on its own, with no chat.",
  },
  "examples/with-tap-runtime": {
    status: "internal",
    why: "It shows a runtime built straight on tap and the store, not a chat to start from.",
  },
  "examples/waterfall": {
    status: "review",
    why: "It demonstrates react-o11y, not a chat, and has no README. It may belong under Utilities.",
  },
  "examples/with-heat-graph": {
    status: "review",
    why: "It demonstrates heat-graph, not a chat, and has no README. It may belong under Utilities.",
  },
  "playgrounds/base-assistant-ui": TEMPORARY_HOST,
  "playgrounds/product-docs": TEMPORARY_HOST,
  "playgrounds/developer-api": TEMPORARY_HOST,
  "playgrounds/website-copilot": TEMPORARY_HOST,
  "playgrounds/docs-search": TEMPORARY_HOST,
  "playgrounds/code-examples": TEMPORARY_HOST,
  "playgrounds/integration-health": TEMPORARY_HOST,
  "playgrounds/incident-command": TEMPORARY_HOST,
  "playgrounds/billing-operations": TEMPORARY_HOST,
};

/** The statuses at least one item has, in the order the labels are listed. */
export const LIBRARY_STATUSES_IN_USE = (
  Object.keys(LIBRARY_STATUS_LABEL) as LibraryStatus[]
).filter(
  (status) =>
    status === "live" ||
    Object.values(NOT_LIVE).some((note) => note.status === status),
);

/** An item's status, and why when it is not live. */
export const libraryStatus = (
  id: string,
): { status: LibraryStatus; why?: string } =>
  NOT_LIVE[id] ?? { status: "live" };
