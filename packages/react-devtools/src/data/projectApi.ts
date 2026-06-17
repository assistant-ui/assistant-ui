import type { AssistantClient } from "@assistant-ui/react";
import { isRecord, isStringArray } from "../utils/common";
import {
  sanitizeAndRedact,
  sanitizeForMessage,
  serializeModelContext,
} from "../utils/serialization";
import type { ApiInfo, EventLogEntry } from "./types";

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: ReadonlyArray<EventLogEntry>;
}

/**
 * Lists the method names of a client proxy. The client proxy throws from its
 * `getOwnPropertyDescriptor` trap, so `Object.keys` is best-effort and isolated
 * from state extraction.
 */
const readMethods = (scopeValue: unknown): string[] => {
  if (!scopeValue || typeof scopeValue !== "object") return [];
  try {
    return Object.keys(scopeValue).filter(
      (key) =>
        typeof (scopeValue as Record<string, unknown>)[key] === "function",
    );
  } catch {
    return [];
  }
};

type ThreadsClientMethods = {
  __internal_getAssistantRuntime?: () => {
    threads: {
      getById: (threadId: string) => {
        getState: () => {
          messages: unknown;
          isRunning?: boolean;
          isLoading?: boolean;
          isDisabled?: boolean;
          suggestions: unknown;
          capabilities: unknown;
        };
        composer: { getState: () => unknown };
      };
    };
  };
};

/**
 * Reads cached thread states for every id in the thread list. Only threads whose
 * runtime has been mounted (visited in the app) return data; unvisited threads
 * are omitted so DevTools can still list them from `state.threads.threadItems`.
 */
const collectThreadSnapshots = (
  entry: DevToolsApiEntry,
  state: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const threadsState = state.threads;
  if (!isRecord(threadsState)) return undefined;

  const threadsScope = entry.api.threads;
  if (typeof threadsScope !== "function") return undefined;

  let threadsClient: ThreadsClientMethods;
  try {
    threadsClient = threadsScope() as ThreadsClientMethods;
  } catch {
    return undefined;
  }

  const assistantRuntime = threadsClient.__internal_getAssistantRuntime?.();
  if (!assistantRuntime) return undefined;

  const threadIds = [
    ...isStringArray(threadsState.threadIds),
    ...isStringArray(threadsState.archivedThreadIds),
  ];
  if (threadIds.length === 0) return undefined;

  const snapshots: Record<string, unknown> = {};
  for (const threadId of threadIds) {
    try {
      const threadRuntime = assistantRuntime.threads.getById(threadId);
      const threadState = threadRuntime.getState();
      snapshots[threadId] = sanitizeForMessage({
        messages: threadState.messages,
        isRunning: threadState.isRunning,
        isLoading: threadState.isLoading,
        isDisabled: threadState.isDisabled,
        suggestions: threadState.suggestions,
        capabilities: threadState.capabilities,
        composer: threadRuntime.composer.getState(),
      });
    } catch {
      // Thread runtime not mounted yet (never opened in the app).
    }
  }

  return Object.keys(snapshots).length > 0 ? snapshots : undefined;
};

/**
 * Projects a live DevToolsHooks api entry into the plain, render-ready shape the
 * views consume. This is the in-process equivalent of the old
 * DevToolsHost.sendUpdate(): it walks the scope accessors for root-scope state
 * and the scope graph, normalizes the model context, and redacts credentials.
 *
 * `state` and each `log.data` are passed through sanitizeForMessage so the JSON
 * renderers cannot crash on circular references or non-serializable values;
 * `log.time` is kept as a Date for the clock formatter.
 */
export const projectApi = (apiId: number, entry: DevToolsApiEntry): ApiInfo => {
  const state: Record<string, unknown> = {};
  const scopes: Array<{
    name: string;
    source: string | null;
    query: Record<string, unknown> | null;
    methods: string[];
  }> = [];

  for (const [name, scope] of Object.entries(entry.api)) {
    if (typeof scope !== "function" || !("source" in scope)) continue;

    let methods: string[] = [];
    try {
      const scopeValue = scope();
      if (scope.source === "root") {
        state[name] = scopeValue?.getState?.() ?? scopeValue;
      }
      methods = readMethods(scopeValue);
    } catch {
      // scope() may throw for derived scopes before the client is mounted.
    }

    scopes.push({
      name,
      source: scope.source,
      query: scope.query,
      methods,
    });
  }

  let modelContext: ApiInfo["modelContext"];
  try {
    modelContext = serializeModelContext(
      entry.api.thread?.().getModelContext(),
    );
  } catch {
    // A throwing thread()/getModelContext() should not drop the whole api;
    // show partial data (state, scopes, logs) without the model context.
  }

  const sanitizedState = sanitizeForMessage(state) as Record<string, unknown>;
  const threadSnapshots = collectThreadSnapshots(entry, sanitizedState);

  return {
    id: apiId,
    state: sanitizedState,
    logs: entry.logs.map((log) => ({
      time: log.time,
      event: log.event,
      data: sanitizeForMessage(log.data),
    })),
    modelContext,
    scopes: sanitizeAndRedact(scopes),
    ...(threadSnapshots ? { threadSnapshots } : {}),
  };
};
