"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  CloudThread,
  UseThreadsOptions,
  UseThreadsResult,
} from "../types";
import { generateThreadTitle } from "./generateThreadTitle";

function toCloudThread(t: {
  id: string;
  title: string;
  is_archived: boolean;
  external_id: string | null;
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
}): CloudThread {
  return {
    id: t.id,
    title: t.title,
    status: t.is_archived ? "archived" : "regular",
    externalId: t.external_id,
    lastMessageAt: new Date(t.last_message_at),
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  };
}

const CLOUD_THREAD_PAGE_SIZE = 20;

type ThreadTitleClaim = {
  readonly title: string;
  readonly order: number;
  readonly settled: Promise<boolean>;
};

type ThreadTitleGeneration = {
  readonly automatic: boolean;
  readonly order: number;
  claim: ThreadTitleClaim | null;
  superseded: boolean;
  readonly persisted: Promise<string | undefined>;
  readonly settlePersisted: (title: string | undefined) => void;
};

type ThreadTitleState = {
  generations: Set<ThreadTitleGeneration>;
  pendingClaim: ThreadTitleClaim | null;
  manualTitle: string | undefined;
  latestExplicit: ThreadTitleGeneration | null;
  nextOrder: number;
};

function getThreadTitleState(
  states: Map<string, ThreadTitleState>,
  threadId: string,
): ThreadTitleState {
  let state = states.get(threadId);
  if (!state) {
    state = {
      generations: new Set(),
      pendingClaim: null,
      manualTitle: undefined,
      latestExplicit: null,
      nextOrder: 0,
    };
    states.set(threadId, state);
  }
  return state;
}

function isCurrentGeneration(
  state: ThreadTitleState,
  generation: ThreadTitleGeneration,
): boolean {
  return (
    !generation.superseded &&
    (state.latestExplicit?.order ?? 0) <= generation.order
  );
}

function isCurrentClaim(
  state: ThreadTitleState,
  claim: ThreadTitleClaim,
): boolean {
  return (state.latestExplicit?.order ?? 0) < claim.order;
}

function takeManualTitle(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  state: ThreadTitleState,
): string | undefined {
  if (
    states.get(threadId) !== state ||
    state.pendingClaim !== null ||
    state.manualTitle === undefined
  ) {
    return undefined;
  }
  const title = state.manualTitle;
  state.manualTitle = undefined;
  pruneThreadTitleState(states, threadId, state);
  return title;
}

function pruneThreadTitleState(
  states: Map<string, ThreadTitleState>,
  threadId: string,
  state: ThreadTitleState,
): void {
  if (
    state.generations.size === 0 &&
    state.pendingClaim === null &&
    state.manualTitle === undefined &&
    states.get(threadId) === state
  ) {
    states.delete(threadId);
  }
}

async function listAllThreads(
  cloud: UseThreadsOptions["cloud"],
  isArchived: boolean,
) {
  const threads: Parameters<typeof toCloudThread>[0][] = [];
  let after: string | undefined;

  while (true) {
    const response = await cloud.threads.list({
      is_archived: isArchived,
      limit: CLOUD_THREAD_PAGE_SIZE,
      ...(after ? { after } : {}),
    });
    threads.push(...response.threads);

    if (response.threads.length < CLOUD_THREAD_PAGE_SIZE) return threads;

    const nextAfter = response.threads.at(-1)?.id;
    if (!nextAfter || nextAfter === after) return threads;
    after = nextAfter;
  }
}

export function useThreads(options: UseThreadsOptions): UseThreadsResult {
  const { cloud, includeArchived = false, enabled = true } = options;
  const threadTitleGenerationsRef = useRef(new Map<string, ThreadTitleState>());
  const includeArchivedRef = useRef(includeArchived);
  useLayoutEffect(() => {
    includeArchivedRef.current = includeArchived;
  }, [includeArchived]);

  const [threads, setThreads] = useState<CloudThread[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [previousEnabled, setPreviousEnabled] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [selection, setSelection] = useState(() => ({
    scope: { cloud },
    threadId: null as string | null,
  }));
  const selectionRef = useRef(selection);
  const listedThreadIdsRef = useRef(new Set<string>());
  useLayoutEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  const scope = selection.scope;
  const threadId = scope.cloud === cloud ? selection.threadId : null;

  useEffect(() => {
    // The stale-scope commit in between is what lets the layout effect below
    // clear the previous cloud's threads before the new scope takes over.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection((current) =>
      current.scope.cloud === cloud
        ? current
        : { scope: { cloud }, threadId: null },
    );
  }, [cloud]);

  const activeScopeRef = useRef<typeof scope | null>(scope);
  useLayoutEffect(() => {
    const isActiveScope = scope.cloud === cloud;
    activeScopeRef.current = isActiveScope ? scope : null;
    if (!isActiveScope) {
      listedThreadIdsRef.current.clear();
      threadTitleGenerationsRef.current.clear();
      // Paired with the ref clears above, which cannot move into render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThreads([]);
      setError(null);
      setIsLoading(enabled);
    }
  }, [cloud, enabled, scope]);
  const isCurrentCloud = useCallback(
    () => scope.cloud === cloud && activeScopeRef.current === scope,
    [cloud, scope],
  );

  if (enabled !== previousEnabled) {
    setPreviousEnabled(enabled);
    setIsLoading(enabled);
  }

  const mountedRef = useRef(true);
  const refreshRequestRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const withAction = useCallback(
    async <T>(
      action: (commit: (update: () => void) => void) => Promise<T>,
      fallback: T,
      shouldUpdate: () => boolean = () => true,
    ): Promise<T> => {
      const commit = (update: () => void) => {
        if (mountedRef.current && shouldUpdate()) update();
      };
      try {
        const result = await action(commit);
        commit(() => setError(null));
        return result;
      } catch (err) {
        commit(() =>
          setError(err instanceof Error ? err : new Error(String(err))),
        );
        return fallback;
      }
    },
    [],
  );

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!isCurrentCloud()) return false;

    const requestId = ++refreshRequestRef.current;
    const isLatest = () =>
      requestId === refreshRequestRef.current && isCurrentCloud();
    const selectedThreadId =
      selectionRef.current.scope === scope
        ? selectionRef.current.threadId
        : null;
    // A never-listed selection may be a new thread whose list entry is lagging;
    // probing it could incorrectly deselect an in-flight conversation.
    const selectedThreadWasListed =
      selectedThreadId !== null &&
      listedThreadIdsRef.current.has(selectedThreadId);
    setIsLoading(true);

    try {
      return await withAction(
        async (commit) => {
          // Keep includeArchived refreshes atomic; withAction preserves the
          // previous complete list and exposes either request's failure.
          const threadGroups = includeArchived
            ? await Promise.all([
                listAllThreads(cloud, false),
                listAllThreads(cloud, true),
              ])
            : [await listAllThreads(cloud, false)];
          const nextThreads = Array.from(
            new Map(
              threadGroups.flat().map((thread) => [thread.id, thread] as const),
            ).values(),
            toCloudThread,
          );
          if (includeArchived) {
            nextThreads.sort((a, b) => {
              const timeDifference =
                b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
              return timeDifference || b.id.localeCompare(a.id);
            });
          }
          const nextThreadIds = new Set(nextThreads.map((thread) => thread.id));
          commit(() => {
            for (const id of nextThreadIds) {
              listedThreadIdsRef.current.add(id);
            }
            setThreads(nextThreads);
            setIsLoading(false);
            setError(null);
          });

          if (!isLatest()) return true;

          let shouldClearSelectedThread = false;
          if (
            selectedThreadWasListed &&
            selectedThreadId !== null &&
            !nextThreadIds.has(selectedThreadId)
          ) {
            try {
              const selectedThread = await cloud.threads.get(selectedThreadId);
              shouldClearSelectedThread =
                !includeArchivedRef.current && selectedThread.is_archived;
            } catch (error) {
              shouldClearSelectedThread =
                typeof error === "object" &&
                error !== null &&
                "status" in error &&
                error.status === 404;
            }
          }
          if (shouldClearSelectedThread) {
            commit(() =>
              setSelection((current) =>
                current.scope === scope && current.threadId === selectedThreadId
                  ? { scope, threadId: null }
                  : current,
              ),
            );
          }
          return true;
        },
        false,
        isLatest,
      );
    } finally {
      if (mountedRef.current && isLatest()) {
        setIsLoading(false);
      }
    }
  }, [cloud, includeArchived, isCurrentCloud, scope, withAction]);

  useEffect(() => {
    if (!enabled) return;
    // The refresh is an async fetch against the cloud; its loading state
    // settles inside it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh, enabled]);

  const get = useCallback(
    async (id: string): Promise<CloudThread | null> => {
      return await withAction(
        async () => {
          const thread = await cloud.threads.get(id);
          return toCloudThread(thread);
        },
        null,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const create = useCallback(
    async (opts?: { externalId?: string }): Promise<CloudThread | null> => {
      return await withAction(
        async (commit) => {
          const response = await cloud.threads.create({
            last_message_at: new Date(),
            external_id: opts?.externalId,
          });
          const thread = await cloud.threads.get(response.thread_id);
          const cloudThread = toCloudThread(thread);

          commit(() => setThreads((prev) => [cloudThread, ...prev]));

          return cloudThread;
        },
        null,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const deleteThread = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.delete(id);
          commit(() => {
            threadTitleGenerationsRef.current.delete(id);
            setThreads((prev) => prev.filter((t) => t.id !== id));
            setSelection((current) =>
              current.scope === scope && current.threadId === id
                ? { scope, threadId: null }
                : current,
            );
          });
          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, scope, withAction],
  );

  const rename = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      const state = getThreadTitleState(threadTitleGenerationsRef.current, id);
      let settleClaim!: (renamed: boolean) => void;
      const settled = new Promise<boolean>((resolve) => {
        settleClaim = resolve;
      });
      const claim = { title, order: ++state.nextOrder, settled };
      state.pendingClaim = claim;
      for (const generation of state.generations) {
        if (generation.order < claim.order) generation.claim = claim;
      }

      const renamed = await withAction(
        async (commit) => {
          await cloud.threads.update(id, { title });
          commit(() =>
            setThreads((prev) =>
              prev.map((t) => (t.id === id ? { ...t, title } : t)),
            ),
          );
          return true;
        },
        false,
        isCurrentCloud,
      );
      settleClaim(renamed);
      if (state.pendingClaim === claim) {
        state.pendingClaim = null;
        if (renamed) state.manualTitle = title;
      }
      pruneThreadTitleState(threadTitleGenerationsRef.current, id, state);
      return renamed;
    },
    [cloud, isCurrentCloud, withAction],
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.update(id, { is_archived: true });

          commit(() => {
            const shouldIncludeArchived = includeArchivedRef.current;
            setThreads((prev) => {
              if (shouldIncludeArchived) {
                return prev.map((t) =>
                  t.id === id ? { ...t, status: "archived" } : t,
                );
              }
              return prev.filter((t) => t.id !== id);
            });
            if (!shouldIncludeArchived) {
              setSelection((current) =>
                current.scope === scope && current.threadId === id
                  ? { scope, threadId: null }
                  : current,
              );
            }
          });

          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, scope, withAction],
  );

  const unarchive = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.update(id, { is_archived: false });
          const thread = await cloud.threads.get(id);
          const cloudThread = toCloudThread(thread);

          commit(() =>
            setThreads((prev) => {
              const filtered = prev.filter((t) => t.id !== id);
              return [cloudThread, ...filtered];
            }),
          );

          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const selectThread = useCallback(
    (id: string | null) => {
      if (!isCurrentCloud()) return;

      const nextSelection = { scope, threadId: id };
      selectionRef.current = nextSelection;
      setSelection((current) =>
        current.scope === scope ? nextSelection : current,
      );
    },
    [isCurrentCloud, scope],
  );

  const generateTitleWithPolicy = useCallback(
    async (tid: string, automatic: boolean): Promise<string | null> => {
      const state = getThreadTitleState(threadTitleGenerationsRef.current, tid);
      if (automatic) {
        const retained = takeManualTitle(
          threadTitleGenerationsRef.current,
          tid,
          state,
        );
        if (retained !== undefined) return retained;
      }
      if (!automatic) {
        state.pendingClaim = null;
        state.manualTitle = undefined;
      }

      let settlePersisted!: (title: string | undefined) => void;
      const persisted = new Promise<string | undefined>((resolve) => {
        settlePersisted = resolve;
      });
      const generation: ThreadTitleGeneration = {
        automatic,
        order: ++state.nextOrder,
        claim: automatic ? state.pendingClaim : null,
        superseded: false,
        persisted,
        settlePersisted,
      };
      if (!automatic) {
        state.latestExplicit = generation;
        for (const active of state.generations) {
          if (active.automatic) active.superseded = true;
        }
      }
      state.generations.add(generation);

      let persistedTitle: string | undefined;
      let persistedOrder = generation.order;
      try {
        return await withAction(
          async (commit) => {
            let title: string | null = null;
            let generated = false;

            const settleClaim = async (claim: ThreadTitleClaim) => {
              const renamed = await claim.settled;
              if (generation.claim !== claim) return undefined;
              if (!renamed) {
                generation.claim = null;
                if (state.pendingClaim === claim) state.pendingClaim = null;
              }
              return renamed;
            };

            const runGeneration = async () => {
              while (true) {
                if (generation.claim) {
                  const claim = generation.claim;
                  const renamed = await settleClaim(claim);
                  if (renamed === undefined) continue;
                  if (renamed === false) {
                    if (automatic) {
                      const retained = takeManualTitle(
                        threadTitleGenerationsRef.current,
                        tid,
                        state,
                      );
                      if (retained !== undefined) {
                        title = retained;
                        return;
                      }
                    }
                    continue;
                  }

                  if (generated) {
                    if (!isCurrentClaim(state, claim)) return;
                    await cloud.threads.update(tid, { title: claim.title });
                    if (generation.claim !== claim) continue;
                    persistedTitle = claim.title;
                    persistedOrder = claim.order;
                    commit(() =>
                      setThreads((prev) =>
                        prev.map((t) =>
                          t.id === tid ? { ...t, title: claim.title } : t,
                        ),
                      ),
                    );
                  }
                  if (automatic) state.manualTitle = undefined;
                  title = claim.title;
                  return;
                }

                if (generated) break;
                generated = true;
                title = await generateThreadTitle(cloud, tid);
              }

              if (title) {
                const generatedTitle = title;
                persistedTitle = generatedTitle;
                if (isCurrentGeneration(state, generation)) {
                  commit(() =>
                    setThreads((prev) =>
                      prev.map((t) =>
                        t.id === tid ? { ...t, title: generatedTitle } : t,
                      ),
                    ),
                  );
                }
              }
            };

            const repairLostRace = async () => {
              if (persistedTitle === undefined) return;
              while (true) {
                const claim = generation.claim;
                if (claim !== null && claim.order > persistedOrder) {
                  const renamed = await settleClaim(claim);
                  if (renamed === undefined) continue;
                  if (renamed === true) {
                    if (!isCurrentClaim(state, claim)) return;
                    await cloud.threads.update(tid, { title: claim.title });
                    persistedTitle = claim.title;
                    persistedOrder = claim.order;
                  }
                  continue;
                }

                const winner = state.latestExplicit;
                if (winner === null || winner.order <= persistedOrder) return;
                const winnerTitle = await winner.persisted;
                if (state.latestExplicit !== winner) continue;
                persistedOrder = winner.order;
                if (
                  winnerTitle === undefined ||
                  winnerTitle === persistedTitle
                ) {
                  return;
                }
                persistedTitle = winnerTitle;
                await cloud.threads.update(tid, { title: winnerTitle });
              }
            };

            await runGeneration();
            await repairLostRace();
            return title;
          },
          null,
          isCurrentCloud,
        );
      } finally {
        generation.settlePersisted(persistedTitle);
        state.generations.delete(generation);
        pruneThreadTitleState(threadTitleGenerationsRef.current, tid, state);
      }
    },
    [cloud, isCurrentCloud, withAction],
  );

  const generateTitle = useCallback(
    (tid: string, options?: { automatic?: boolean }) =>
      generateTitleWithPolicy(tid, options?.automatic ?? false),
    [generateTitleWithPolicy],
  );

  return {
    cloud,
    threads,
    isLoading,
    error,
    refresh,
    get,
    create,
    delete: deleteThread,
    rename,
    archive,
    unarchive,
    threadId,
    selectThread,
    generateTitle,
  };
}
