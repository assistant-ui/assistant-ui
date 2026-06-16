import type { AssistantClient } from "@assistant-ui/react";
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

  return {
    id: apiId,
    state: sanitizeForMessage(state) as Record<string, unknown>,
    logs: entry.logs.map((log) => ({
      time: log.time,
      event: log.event,
      data: sanitizeForMessage(log.data),
    })),
    modelContext,
    scopes: sanitizeAndRedact(scopes),
  };
};
