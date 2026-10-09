import { isDev } from "./guard";
import { LOG_PREFIX, NAME } from "./name";
import { parseSearch, serializeSearch, type UrlState } from "./url";

export type VariantMeta = { id: string; label: string };

export type GroupMeta = {
  id: string;
  label: string;
  variants: VariantMeta[];
  defaultId: string | undefined;
  persist: boolean;
  /** The `<Variant>` this group is nested in, when it is. */
  parent: { group: string; variant: string } | undefined;
};

export type Snapshot = {
  groups: readonly GroupMeta[];
  selections: Readonly<Record<string, string>>;
  hideUI: boolean;
  clean: boolean;
  collapsed: boolean;
  outline: boolean;
  canvas: boolean;
  /** Group ids that have a row in the open canvas, in page order. */
  canvasRows: readonly string[];
  focus: { group: string; seq: number } | undefined;
  /** The group whose switcher row and page region are linked by hover or focus. */
  highlight: { group: string; source: "switcher" | "page" } | undefined;
  notes: readonly ClientNote[];
  /** Where notes live: source files through the dev endpoints, or this tab. */
  notesMode: "probing" | "server" | "session";
};

export type ClientNote = {
  id: string;
  group: string;
  /** Unset for a note on the whole group. */
  variant: string | undefined;
  note: string;
  hint?: string | undefined;
  source: "file" | "session";
  file?: string | undefined;
  line?: number | undefined;
};

export type Store = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Snapshot;
  getServerSnapshot: () => Snapshot;
  register: (meta: GroupMeta) => () => void;
  select: (group: string, value: string) => void;
  cycle: (group: string, delta: number) => string | undefined;
  setCollapsed: (collapsed: boolean) => void;
  setOutline: (outline: boolean) => void;
  setCanvas: (open: boolean) => void;
  setCanvasRows: (rows: readonly string[]) => void;
  focusGroup: (group: string) => void;
  /** Sets the linked group, or clears it when `group` is undefined and `source` set it. */
  setHighlight: (
    group: string | undefined,
    source: "switcher" | "page",
  ) => void;
  setNotes: (notes: readonly ClientNote[], mode: "server" | "session") => void;
  reset: () => void;
};

export type MountUI = (store: Store) => () => void;

const INITIAL: Snapshot = Object.freeze({
  groups: [],
  selections: {},
  hideUI: false,
  clean: false,
  collapsed: false,
  outline: true,
  canvas: false,
  canvasRows: [],
  focus: undefined,
  highlight: undefined,
  notes: [],
  notesMode: "probing",
});

export const storageKey = (group: string) => `${NAME}:${group}`;
export const COLLAPSED_KEY = `${NAME}:ui-collapsed`;
export const OUTLINE_KEY = `${NAME}:outline`;

const storage = {
  get(key: string): string | undefined {
    try {
      return window.sessionStorage.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set(key: string, value: string | undefined) {
    try {
      if (value === undefined) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch {}
  },
};

const hasWindow = () => typeof window !== "undefined";
const hasDocument = () => typeof document !== "undefined";

const readUrl = (): UrlState =>
  parseSearch(hasWindow() ? window.location.search : "");

export const resolveActive = (
  meta: Pick<GroupMeta, "variants" | "defaultId">,
  selection: string | undefined,
): string | undefined => {
  const has = (id: string | undefined) =>
    id !== undefined && meta.variants.some((variant) => variant.id === id);
  return has(selection)
    ? selection
    : has(meta.defaultId)
      ? meta.defaultId
      : meta.variants[0]?.id;
};

/** Groups with every nested group placed right after its parent, recursively. */
export const treeOrder = (groups: readonly GroupMeta[]): GroupMeta[] => {
  const ids = new Set(groups.map((meta) => meta.id));
  const isRoot = (meta: GroupMeta) =>
    !meta.parent || !ids.has(meta.parent.group);
  const result: GroupMeta[] = [];
  const visit = (meta: GroupMeta, depth: number) => {
    if (depth > 20 || result.includes(meta)) return;
    result.push(meta);
    for (const child of groups) {
      if (child.parent?.group === meta.id) visit(child, depth + 1);
    }
  };
  for (const meta of groups) if (isRoot(meta)) visit(meta, 0);
  for (const meta of groups) if (!result.includes(meta)) result.push(meta);
  return result;
};

export const depthOf = (
  meta: GroupMeta,
  groups: readonly GroupMeta[],
): number => {
  let depth = 0;
  for (
    let parent = meta.parent;
    parent && depth < 20;
    parent = groups.find((group) => group.id === parent!.group)?.parent
  ) {
    if (!groups.some((group) => group.id === parent!.group)) break;
    depth++;
  }
  return depth;
};

export const createStore = (
  mountUI?: MountUI,
  mountCanvas?: MountUI,
): Store => {
  let snapshot = INITIAL;
  let entries: { token: object; meta: GroupMeta }[] = [];
  let teardownUI: (() => void) | undefined;
  let teardownCanvas: (() => void) | undefined;
  const listeners = new Set<() => void>();

  const groups = () => {
    const seen = new Set<string>();
    return entries
      .map((entry) => entry.meta)
      .filter((meta) => !seen.has(meta.id) && seen.add(meta.id));
  };

  const findMeta = (group: string) =>
    entries.find((entry) => entry.meta.id === group)?.meta;

  const emit = (next: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  const loadSelection = (meta: GroupMeta, url: UrlState, keep = true) =>
    url.selections.get(meta.id) ??
    (meta.persist ? storage.get(storageKey(meta.id)) : undefined) ??
    (keep ? snapshot.selections[meta.id] : undefined);

  const writeUrl = () => {
    if (!hasWindow()) return;
    try {
      const { location, history } = window;
      const url = parseSearch(location.search);
      for (const meta of groups()) {
        const value = snapshot.selections[meta.id];
        if (value === undefined) url.selections.delete(meta.id);
        else url.selections.set(meta.id, value);
      }
      url.canvas = snapshot.canvas;
      const search = serializeSearch(location.search, url);
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${search}${location.hash}`,
      );
    } catch {}
  };

  const syncCanvas = () => {
    const wanted = snapshot.canvas && entries.length > 0 && hasDocument();
    if (wanted && !teardownCanvas && mountCanvas) {
      teardownCanvas = mountCanvas(store);
    } else if (!wanted && teardownCanvas) {
      const teardown = teardownCanvas;
      teardownCanvas = undefined;
      teardown();
      if (snapshot.canvasRows.length > 0) emit({ canvasRows: [] });
    }
  };

  const onPopState = () => {
    const url = readUrl();
    const selections = { ...snapshot.selections };
    for (const meta of groups()) {
      const value = loadSelection(meta, url, false);
      if (value === undefined) delete selections[meta.id];
      else selections[meta.id] = value;
    }
    emit({
      selections,
      hideUI: url.hideUI,
      clean: url.clean,
      canvas: url.canvas,
    });
    syncCanvas();
  };

  const store: Store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL,
    register(meta) {
      if (isDev() && entries.some((entry) => entry.meta.id === meta.id)) {
        console.error(
          `${LOG_PREFIX} Two mounted <Variants> share the id "${meta.id}". Group ids must be unique on a page, because the URL, the switcher and the data-variant-group hook address groups by id.`,
        );
      }
      const token = {};
      const first = entries.length === 0;
      entries = [...entries, { token, meta }];
      const url = readUrl();
      const next: Partial<Snapshot> = {};
      if (first) {
        next.hideUI = url.hideUI;
        next.clean = url.clean;
        next.canvas = url.canvas;
        next.collapsed = storage.get(COLLAPSED_KEY) === "1";
        next.outline = storage.get(OUTLINE_KEY) !== "0";
        if (hasWindow()) window.addEventListener("popstate", onPopState);
      }
      const selection = loadSelection(meta, url);
      if (selection !== undefined) {
        next.selections = { ...snapshot.selections, [meta.id]: selection };
      }
      emit({ ...next, groups: groups() });
      if (first && mountUI && hasDocument()) {
        teardownUI = mountUI(store);
      }
      syncCanvas();
      return () => {
        entries = entries.filter((entry) => entry.token !== token);
        if (entries.length === 0) {
          teardownUI?.();
          teardownUI = undefined;
          if (hasWindow()) window.removeEventListener("popstate", onPopState);
        }
        emit({ groups: groups() });
        syncCanvas();
      };
    },
    select(group, value) {
      const selections = { ...snapshot.selections, [group]: value };
      if (findMeta(group)?.persist) storage.set(storageKey(group), value);
      emit({ selections });
      writeUrl();
    },
    cycle(group, delta) {
      const meta = findMeta(group);
      if (!meta || meta.variants.length === 0) return undefined;
      const active = resolveActive(meta, snapshot.selections[group]);
      const index = meta.variants.findIndex((variant) => variant.id === active);
      const length = meta.variants.length;
      const nextId = meta.variants[(index + delta + length) % length]!.id;
      store.select(group, nextId);
      return nextId;
    },
    setCollapsed(collapsed) {
      storage.set(COLLAPSED_KEY, collapsed ? "1" : undefined);
      emit({ collapsed });
    },
    setOutline(outline) {
      storage.set(OUTLINE_KEY, outline ? undefined : "0");
      emit({ outline });
    },
    setCanvas(open) {
      if (open === snapshot.canvas) return;
      emit({ canvas: open });
      syncCanvas();
      writeUrl();
    },
    setCanvasRows(rows) {
      const same =
        rows.length === snapshot.canvasRows.length &&
        rows.every((row, index) => row === snapshot.canvasRows[index]);
      if (!same) emit({ canvasRows: [...rows] });
    },
    focusGroup(group) {
      storage.set(COLLAPSED_KEY, undefined);
      emit({
        collapsed: false,
        focus: { group, seq: (snapshot.focus?.seq ?? 0) + 1 },
      });
    },
    setHighlight(group, source) {
      const current = snapshot.highlight;
      if (group === undefined) {
        if (current?.source === source) emit({ highlight: undefined });
        return;
      }
      if (current?.group === group && current.source === source) return;
      emit({ highlight: { group, source } });
    },
    setNotes(notes, notesMode) {
      emit({ notes: [...notes], notesMode });
    },
    reset() {
      teardownUI?.();
      teardownUI = undefined;
      teardownCanvas?.();
      teardownCanvas = undefined;
      if (hasWindow()) window.removeEventListener("popstate", onPopState);
      entries = [];
      snapshot = INITIAL;
      for (const listener of listeners) listener();
    },
  };
  return store;
};
