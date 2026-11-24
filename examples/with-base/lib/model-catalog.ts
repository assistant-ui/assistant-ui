"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  MODELS_PAGE_SIZE,
  ModelpediaError,
  listModels,
  listProviders,
  listTypes,
  type CatalogModel,
  type CatalogProvider,
} from "./modelpedia";

/*
 * What this visit has read from Modelpedia, held outside the settings so that
 * opening them again asks for nothing new. A list is read once and kept until
 * the person checks for new models, and then stays on show until its fresh
 * copy arrives.
 */

export type ModelList = {
  models: readonly CatalogModel[];
  /** How far into the catalog the pages read so far reach, and its size. */
  offset: number;
  total: number;
  checkedAt: number;
};

/** Why a request failed: `limited` is the limit on requests a minute. */
export type CatalogProblem = "failed" | "limited";

type Catalog = {
  providers: readonly CatalogProvider[];
  types: readonly string[];
  /** The models read so far, by the provider and the search they answer. */
  lists: ReadonlyMap<string, ModelList>;
  problems: ReadonlyMap<string, CatalogProblem>;
  /** How many requests are out. */
  pending: number;
};

const EMPTY: Catalog = {
  providers: [],
  types: [],
  lists: new Map(),
  problems: new Map(),
  pending: 0,
};

const FACETS = "facets";
const MAX_LISTS = 40;

let catalog = EMPTY;
let facetsCheckedAt = 0;
/* Anything read before this moment is read again when next shown. */
let staleBefore = 0;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function update(change: (current: Catalog) => Partial<Catalog>) {
  catalog = { ...catalog, ...change(catalog) };
  for (const listener of listeners) listener();
}

/* A provider of `null` stands for every provider. */
const listKey = (provider: string | null, query: string) =>
  `${provider ?? ""}\n${query}`;

function without<T>(map: ReadonlyMap<string, T>, key: string) {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}

function withList(
  lists: ReadonlyMap<string, ModelList>,
  key: string,
  list: ModelList,
) {
  const next = new Map(lists);
  next.delete(key);
  next.set(key, list);
  for (const oldest of next.keys()) {
    if (next.size <= MAX_LISTS) break;
    next.delete(oldest);
  }
  return next;
}

/* One request: counted while it is out, and noted under `key` if it fails. */
async function read<T>(
  key: string,
  signal: AbortSignal,
  ask: () => Promise<T>,
  keep: (answer: T, current: Catalog) => Partial<Catalog>,
) {
  update((current) => ({
    pending: current.pending + 1,
    problems: without(current.problems, key),
  }));
  let change: (current: Catalog) => Partial<Catalog>;
  try {
    const answer = await ask();
    change = (current) => keep(answer, current);
  } catch (error) {
    const problem: CatalogProblem =
      error instanceof ModelpediaError && error.limited ? "limited" : "failed";
    change = (current) =>
      signal.aborted
        ? {}
        : { problems: new Map(current.problems).set(key, problem) };
  }
  update((current) => ({ ...change(current), pending: current.pending - 1 }));
}

function loadFacets(signal: AbortSignal) {
  if (
    catalog.providers.length > 0 &&
    catalog.types.length > 0 &&
    facetsCheckedAt >= staleBefore
  )
    return;
  void read(
    FACETS,
    signal,
    () => Promise.all([listProviders(signal), listTypes(signal)]),
    ([providers, types]) => {
      facetsCheckedAt = Date.now();
      return { providers, types };
    },
  );
}

function loadModels(
  provider: string | null,
  query: string,
  signal: AbortSignal,
) {
  const key = listKey(provider, query);
  const list = catalog.lists.get(key);
  if (list && list.checkedAt >= staleBefore) return;
  void read(
    key,
    signal,
    () => listModels({ provider, query, offset: 0 }, signal),
    ({ models, total }, current) => ({
      lists: withList(current.lists, key, {
        models,
        total,
        offset: MODELS_PAGE_SIZE,
        checkedAt: Date.now(),
      }),
    }),
  );
}

function loadMoreModels(provider: string | null, query: string) {
  const key = listKey(provider, query);
  const list = catalog.lists.get(key);
  if (!list || list.offset >= list.total) return;
  const { offset } = list;
  const { signal } = new AbortController();
  void read(
    key,
    signal,
    () => listModels({ provider, query, offset }, signal),
    ({ models, total }, current) => {
      const now = current.lists.get(key);
      /* Another answer for the same page got here first. */
      if (!now || now.offset !== offset) return {};
      return {
        lists: withList(current.lists, key, {
          ...now,
          models: [...now.models, ...models],
          offset: offset + MODELS_PAGE_SIZE,
          total,
        }),
      };
    },
  );
}

type View = { sources: readonly (string | null)[]; query: string };

/**
 * The providers, the kinds of model, and the models of each of `sources` (a
 * provider's id, or `null` for every provider) that match `query`. `sources`
 * must keep its identity until it changes, since a new one is read afresh.
 * While none of a new view's models have arrived, the last view stays on
 * show and `waiting` is set.
 */
export function useCatalog(sources: View["sources"], query: string) {
  const current = useSyncExternalStore(
    subscribe,
    () => catalog,
    () => EMPTY,
  );
  const [attempt, setAttempt] = useState(0);
  const [shown, setShown] = useState<View>({ sources, query });

  useEffect(() => {
    const controller = new AbortController();
    loadFacets(controller.signal);
    for (const source of sources) loadModels(source, query, controller.signal);
    return () => controller.abort();
  }, [sources, query, attempt]);

  const arrived = sources.some((source) =>
    current.lists.has(listKey(source, query)),
  );
  if (arrived && (shown.sources !== sources || shown.query !== query))
    setShown({ sources, query });
  const view = arrived ? { sources, query } : shown;

  return {
    providers: current.providers,
    types: current.types,
    sources: view.sources,
    /** One for each of `sources`; a list not yet read is `undefined`. */
    lists: view.sources.map((source) =>
      current.lists.get(listKey(source, view.query)),
    ),
    waiting: !arrived,
    busy: current.pending > 0,
    problem: [
      FACETS,
      ...sources.map((source) => listKey(source, query)),
    ].flatMap((key) => current.problems.get(key) ?? [])[0],
    /** Reads the next page of every list on show that has one. */
    loadMore: () => {
      for (const source of view.sources) loadMoreModels(source, view.query);
    },
    retry: () => setAttempt((count) => count + 1),
    /** Reads the providers, the kinds and the models on show again. */
    refresh: () => {
      staleBefore = Date.now();
      setAttempt((count) => count + 1);
    },
  };
}
