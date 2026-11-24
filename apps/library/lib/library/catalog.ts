export const LIBRARY_PATH = "/";
export const SETUP_PATH = "/setup";

export const LIBRARY_CATEGORIES = [
  {
    id: "components",
    label: "Components",
    description: "Chat elements, UI components, and unstyled primitives.",
  },
  {
    id: "blocks",
    label: "Blocks",
    description: "Whole app surfaces with an assistant built in.",
  },
  {
    id: "themes",
    label: "Themes",
    description: "Presets for a project's style, colors, icons, and fonts.",
  },
  {
    id: "starters",
    label: "Starters",
    description: "Templates and example apps the CLI scaffolds.",
  },
  {
    id: "runtimes",
    label: "Runtimes",
    description: "Adapters that connect the UI to a backend.",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Frameworks, auth, observability, and storage.",
  },
  {
    id: "tools",
    label: "Tools",
    description: "Tool calls, generative UI, and MCP.",
  },
  {
    id: "utilities",
    label: "Utilities",
    description: "Standalone packages that work without assistant-ui.",
  },
  {
    id: "skills",
    label: "Skills",
    description:
      "Instructions for coding agents, and the agents they install into.",
  },
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];
export type LibraryCategoryId = LibraryCategory["id"];

export const LIBRARY_CATEGORY_IDS = LIBRARY_CATEGORIES.map(
  (category) => category.id,
) as [LibraryCategoryId, ...LibraryCategoryId[]];

/** Categories whose items are shown as previews rather than rows. */
export const GALLERY_CATEGORIES: readonly LibraryCategoryId[] = [
  "components",
  "blocks",
  "themes",
];

export const isLibraryCategoryId = (
  value: string,
): value is LibraryCategoryId =>
  LIBRARY_CATEGORY_IDS.some((id) => id === value);

export const libraryCategoryHref = (id: LibraryCategoryId) => `/${id}`;

/** The category a library address shows, or null on the library's home. */
export const libraryCategoryAt = (
  pathname: string,
): LibraryCategoryId | null => {
  const segment = pathname.split("/")[1] ?? "";
  return isLibraryCategoryId(segment) ? segment : null;
};

export const getLibraryCategory = (id: LibraryCategoryId): LibraryCategory =>
  LIBRARY_CATEGORIES.find((category) => category.id === id)!;

/** The sections of the components page, in the order it shows them. */
export const COMPONENT_SECTIONS = [
  "Elements",
  "AUI connected",
  "UI",
  "Primitives",
] as const;

export type ComponentSection = (typeof COMPONENT_SECTIONS)[number];

/** Where a section's heading sits on its page. */
export const sectionAnchor = (section: string) =>
  section.toLowerCase().replaceAll(" ", "-");

export type LibraryInstall =
  | { kind: "shadcn"; names: readonly string[] }
  | { kind: "npm"; names: readonly string[] }
  | { kind: "command"; command: string };

export type LibraryPreview =
  | { kind: "demo"; slug: string }
  | { kind: "specimen"; slug: string }
  | { kind: "sample"; slug: string }
  | { kind: "theme"; slug: string }
  | { kind: "image"; light: string; dark: string };

export const LIBRARY_MARKS = [
  "a2a",
  "adk",
  "agui",
  "claude",
  "cloudflare",
  "langchain",
  "langfuse",
  "langgraph",
  "mastra",
  "mcp",
  "opencode",
  "vercel",
] as const;

export type LibraryMark = (typeof LIBRARY_MARKS)[number];

export type LibraryItem = {
  /** Unique across the library: the category id, a slash, and the item's slug. */
  id: string;
  category: LibraryCategoryId;
  name: string;
  description: string;
  href: string;
  external: boolean;
  /** Absent when the item is set up by following its page. */
  install?: LibraryInstall;
  /** What a person pastes to their coding agent. */
  prompt: string;
  /** Rules the item has a person add to their global stylesheet. */
  css?: string;
  /** The item running, or a screenshot of it. */
  preview?: LibraryPreview;
  /** Takes both columns of a gallery, for a preview that needs the room. */
  wide?: boolean;
  /** The heading the item is listed under, in a category that has several. */
  section?: string;
  /** What the item is wired to, shown beside its name: "AUI" for the runtime. */
  connection?: string;
  /** The brand the item connects to. */
  mark?: LibraryMark;
};

const SHADCN_ADD = "npx shadcn@latest add";
const NPM_INSTALL = "npm install";

export const installCommand = (install: LibraryInstall): string => {
  switch (install.kind) {
    case "shadcn":
      return `${SHADCN_ADD} ${install.names.join(" ")}`;
    case "npm":
      return `${NPM_INSTALL} ${install.names.join(" ")}`;
    case "command":
      return install.command;
  }
};

/** What a tile has room for: the packages alone, or the whole command. */
export const installLabel = (install: LibraryInstall): string =>
  install.kind === "command" ? install.command : install.names.join(" ");

/** One command per installer, so a cart of registry items installs in one run. */
export const cartCommands = (items: readonly LibraryItem[]): string[] => {
  const shadcn = new Set<string>();
  const npm = new Set<string>();
  const commands = new Set<string>();
  for (const { install } of items) {
    if (!install) continue;
    if (install.kind === "command") commands.add(install.command);
    else
      for (const name of install.names)
        (install.kind === "shadcn" ? shadcn : npm).add(name);
  }
  return [
    ...(shadcn.size > 0 ? [`${SHADCN_ADD} ${[...shadcn].join(" ")}`] : []),
    ...(npm.size > 0 ? [`${NPM_INSTALL} ${[...npm].join(" ")}`] : []),
    ...commands,
  ];
};

export const cartPrompt = (items: readonly LibraryItem[]): string =>
  [...new Set(items.map((item) => item.prompt))].join("\n");

export const matchesLibraryQuery = (
  item: LibraryItem,
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.name, item.description, item.id].some((text) =>
    text.toLowerCase().includes(needle),
  );
};
