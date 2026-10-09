import { isDev } from "./guard";
import { LOG_PREFIX, NAME } from "./name";
import { ALL, parseSearch, serializeSearch, type UrlState } from "./url";

export type VariantMeta = { id: string; label: string };

export type GroupMeta = {
  id: string;
  label: string;
  variants: VariantMeta[];
  defaultId: string | undefined;
  persist: boolean;
};

export type Snapshot = {
  groups: readonly GroupMeta[];
  selections: Readonly<Record<string, string>>;
  globalAll: boolean;
  hideUI: boolean;
  clean: boolean;
  collapsed: boolean;
  outline: boolean;
  focus: { group: string; seq: number } | undefined;
};

export type Store = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Snapshot;
  getServerSnapshot: () => Snapshot;
  register: (meta: GroupMeta) => () => void;
  select: (group: string, value: string) => void;
  cycle: (group: string, delta: number) => string | undefined;
  toggleGroupAll: (group: string) => void;
  toggleGlobalAll: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setOutline: (outline: boolean) => void;
  focusGroup: (group: string) => void;
  reset: () => void;
};

export type MountUI = (store: Store) => () => void;

const INITIAL: Snapshot = Object.freeze({
  groups: [],
  selections: {},
  globalAll: false,
  hideUI: false,
  clean: false,
  collapsed: false,
  outline: true,
  focus: undefined,
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

const readUrl = (): UrlState =>
  parseSearch(hasWindow() ? window.location.search : "");

export const resolveGroup = (
  meta: Pick<GroupMeta, "variants" | "defaultId">,
  selection: string | undefined,
  globalAll: boolean,
): { showAll: boolean; activeId: string | undefined } => {
  const has = (id: string | undefined) =>
    id !== undefined && meta.variants.some((variant) => variant.id === id);
  const activeId = has(selection)
    ? selection
    : has(meta.defaultId)
      ? meta.defaultId
      : meta.variants[0]?.id;
  return { showAll: globalAll || selection === ALL, activeId };
};

export const createStore = (mountUI?: MountUI): Store => {
  let snapshot = INITIAL;
  let entries: { token: object; meta: GroupMeta }[] = [];
  let teardownUI: (() => void) | undefined;
  const previous = new Map<string, string>();
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

  const loadSelection = (meta: GroupMeta, url: UrlState) =>
    url.selections.get(meta.id) ??
    (meta.persist ? storage.get(storageKey(meta.id)) : undefined) ??
    snapshot.selections[meta.id];

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
      url.globalAll = snapshot.globalAll;
      const search = serializeSearch(location.search, url);
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${search}${location.hash}`,
      );
    } catch {}
  };

  const onPopState = () => {
    const url = readUrl();
    const selections = { ...snapshot.selections };
    for (const meta of groups()) {
      const value = loadSelection(meta, url);
      if (value === undefined) delete selections[meta.id];
      else selections[meta.id] = value;
    }
    emit({
      selections,
      globalAll: url.globalAll,
      hideUI: url.hideUI,
      clean: url.clean,
    });
  };

  const setSelection = (group: string, value: string | undefined) => {
    const selections = { ...snapshot.selections };
    if (value === undefined) delete selections[group];
    else selections[group] = value;
    if (findMeta(group)?.persist) storage.set(storageKey(group), value);
    emit({ selections });
    writeUrl();
  };

  const activeOf = (group: string) => {
    const meta = findMeta(group);
    if (!meta) return undefined;
    const selection = snapshot.selections[group];
    return resolveGroup(
      meta,
      selection === ALL ? previous.get(group) : selection,
      false,
    ).activeId;
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
        next.globalAll = url.globalAll;
        next.hideUI = url.hideUI;
        next.clean = url.clean;
        next.collapsed = storage.get(COLLAPSED_KEY) === "1";
        next.outline = storage.get(OUTLINE_KEY) !== "0";
        if (hasWindow()) window.addEventListener("popstate", onPopState);
      }
      const selection = loadSelection(meta, url);
      if (selection !== undefined) {
        next.selections = { ...snapshot.selections, [meta.id]: selection };
        if (selection !== ALL) previous.set(meta.id, selection);
      }
      emit({ ...next, groups: groups() });
      if (first && mountUI && typeof document !== "undefined") {
        teardownUI = mountUI(store);
      }
      return () => {
        entries = entries.filter((entry) => entry.token !== token);
        if (entries.length === 0) {
          teardownUI?.();
          teardownUI = undefined;
          if (hasWindow()) window.removeEventListener("popstate", onPopState);
        }
        emit({ groups: groups() });
      };
    },
    select(group, value) {
      if (value !== ALL) previous.set(group, value);
      setSelection(group, value);
    },
    cycle(group, delta) {
      const meta = findMeta(group);
      if (!meta || meta.variants.length === 0) return undefined;
      const index = meta.variants.findIndex(
        (variant) => variant.id === activeOf(group),
      );
      const length = meta.variants.length;
      const nextId = meta.variants[(index + delta + length) % length]!.id;
      store.select(group, nextId);
      return nextId;
    },
    toggleGroupAll(group) {
      if (snapshot.selections[group] === ALL) {
        setSelection(group, previous.get(group));
        return;
      }
      const active = activeOf(group);
      if (active !== undefined) previous.set(group, active);
      setSelection(group, ALL);
    },
    toggleGlobalAll() {
      emit({ globalAll: !snapshot.globalAll });
      writeUrl();
    },
    setCollapsed(collapsed) {
      storage.set(COLLAPSED_KEY, collapsed ? "1" : undefined);
      emit({ collapsed });
    },
    setOutline(outline) {
      storage.set(OUTLINE_KEY, outline ? undefined : "0");
      emit({ outline });
    },
    focusGroup(group) {
      storage.set(COLLAPSED_KEY, undefined);
      emit({
        collapsed: false,
        focus: { group, seq: (snapshot.focus?.seq ?? 0) + 1 },
      });
    },
    reset() {
      teardownUI?.();
      teardownUI = undefined;
      if (hasWindow()) window.removeEventListener("popstate", onPopState);
      entries = [];
      previous.clear();
      snapshot = INITIAL;
      for (const listener of listeners) listener();
    },
  };
  return store;
};
