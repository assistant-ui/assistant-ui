import data from "./facts-data.json";

/** How an item reaches a project today. */
export const LIBRARY_AVAILABILITY = [
  "Live",
  "Published",
  "In CLI",
  "Supported",
  "Hosted",
  "Docs",
  "Copy only",
  "GitHub only",
  "In development",
] as const;

export type LibraryAvailability = (typeof LIBRARY_AVAILABILITY)[number];

export const LIBRARY_PLATFORMS = [
  "React",
  "React Native",
  "Vue",
  "Svelte",
  "Solid",
  "npm",
  "Coding agents",
] as const;

export type LibraryPlatform = (typeof LIBRARY_PLATFORMS)[number];

export type LibraryLinkKind =
  | "docs"
  | "demo"
  | "site"
  | "source"
  | "npm"
  | "pypi"
  | "registry"
  | "repo";

export const LIBRARY_LINK_LABEL: Record<LibraryLinkKind, string> = {
  docs: "Docs",
  demo: "Demo",
  site: "Site",
  source: "Source",
  npm: "npm",
  pypi: "PyPI",
  registry: "Registry JSON",
  repo: "Repo",
};

/** A link out of an item: its kind, its address (a site path or a full address), and its own label when it has one. */
export type LibraryFactLink = {
  kind: LibraryLinkKind;
  href: string;
  label: string | undefined;
};

/** Something an item needs: another library item by its id, or something outside the library by its key in `others`. */
export type LibraryNeed = { ref: string; via: string | undefined };

/** What is known about one library item beyond its name and its command. */
export type LibraryFact = {
  status: LibraryAvailability;
  statusDetail: string;
  platforms: readonly LibraryPlatform[];
  /** The day its source last changed on the main branch, as an ISO date. */
  updated: string | undefined;
  version: string | undefined;
  links: readonly LibraryFactLink[];
  needs: readonly LibraryNeed[];
  /** npm packages it adds, each with what kind of dependency it is. */
  packages: readonly { name: string; tag: string | undefined }[];
  /** Files it writes into a project, each with where its source is in the repository. */
  files: readonly { path: string; source: string | undefined }[];
  /** Its name in each platform's registry. */
  registry: { react?: string; native?: string; vue?: string } | undefined;
  /** Where a coding agent keeps the skills, for an agent. */
  directory: string | undefined;
  /** The file an editor's setup writes, for an MCP setup. */
  config: string | undefined;
};

type RawNeed = readonly [string, string?];

type RawFact = {
  s: string;
  sd: string;
  p: readonly string[];
  u?: string;
  v?: string;
  l: readonly (readonly [string, string, string?])[];
  n: readonly RawNeed[];
  pk?: readonly (readonly [string, string?])[];
  f?: readonly (readonly [string, string?])[];
  r?: { react?: string; native?: string; vue?: string };
  dir?: string;
  cfg?: string;
};

type RawOther = { n: string; k: string; d: readonly RawNeed[] };

const ITEMS = data.items as unknown as Record<string, RawFact>;
const OTHERS = data.others as unknown as Record<string, RawOther>;

const needs = (list: readonly RawNeed[]): LibraryNeed[] =>
  list.map(([ref, via]) => ({ ref, via }));

/** An item's facts by its id in the saved panel. */
export const libraryFact = (id: string): LibraryFact | undefined => {
  const raw = ITEMS[id];
  if (!raw) return undefined;
  return {
    status: raw.s as LibraryAvailability,
    statusDetail: raw.sd,
    platforms: raw.p as readonly LibraryPlatform[],
    updated: raw.u,
    version: raw.v,
    links: raw.l.map(([kind, href, label]) => ({
      kind: kind as LibraryLinkKind,
      href,
      label,
    })),
    needs: needs(raw.n),
    packages: (raw.pk ?? []).map(([name, tag]) => ({ name, tag })),
    files: (raw.f ?? []).map(([path, source]) => ({ path, source })),
    registry: raw.r,
    directory: raw.dir,
    config: raw.cfg,
  };
};

/** Something an item needs that is not a library item: a support file, a package, or a shadcn/ui primitive. */
export type LibraryOther = { name: string; kind: string };

export const libraryOther = (ref: string): LibraryOther | undefined => {
  const raw = OTHERS[ref];
  return raw ? { name: raw.n, kind: raw.k } : undefined;
};

/** What `ref` needs directly, whether it is a library item or something outside it. */
export const directNeeds = (ref: string): readonly LibraryNeed[] =>
  needs(ITEMS[ref]?.n ?? OTHERS[ref]?.d ?? []);

const USED_BY = new Map<string, string[]>();
for (const [id, raw] of Object.entries(ITEMS)) {
  for (const [ref] of raw.n) {
    const list = USED_BY.get(ref);
    if (list) list.push(id);
    else USED_BY.set(ref, [id]);
  }
}
for (const [id, raw] of Object.entries(OTHERS)) {
  for (const [ref] of raw.d) {
    const list = USED_BY.get(ref);
    if (list) list.push(id);
    else USED_BY.set(ref, [id]);
  }
}

/** The library items that need `id` directly. */
export const directUsedBy = (id: string): readonly string[] =>
  (USED_BY.get(id) ?? []).filter((ref) => ref in ITEMS);

const reach = (
  start: string,
  next: (ref: string) => readonly string[],
): ReadonlySet<string> => {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    for (const ref of next(stack.pop()!)) {
      if (ref === start || seen.has(ref)) continue;
      seen.add(ref);
      stack.push(ref);
    }
  }
  return seen;
};

const NEEDS_TOTAL = new Map<string, number>();
const USED_TOTAL = new Map<string, number>();

/** How many things `id` needs once everything they need is counted too. */
export const totalNeeds = (id: string): number => {
  let total = NEEDS_TOTAL.get(id);
  if (total === undefined) {
    total = reach(id, (ref) => directNeeds(ref).map((need) => need.ref)).size;
    NEEDS_TOTAL.set(id, total);
  }
  return total;
};

/** How many library items need `id`, directly or through something else. */
export const totalUsedBy = (id: string): number => {
  let total = USED_TOTAL.get(id);
  if (total === undefined) {
    total = [...reach(id, (ref) => USED_BY.get(ref) ?? [])].filter(
      (ref) => ref in ITEMS,
    ).length;
    USED_TOTAL.set(id, total);
  }
  return total;
};
