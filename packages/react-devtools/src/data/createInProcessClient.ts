import { DevToolsHooks } from "@assistant-ui/react";
import { projectApi } from "./projectApi";
import {
  EMPTY_SNAPSHOT,
  type ApiInfo,
  type DevToolsClient,
  type DevToolsSnapshot,
} from "./types";

/**
 * The default transport: reads the in-process DevToolsHooks registry and
 * re-projects it on every change.
 *
 * Projection runs inside the subscribe/change callbacks (outside React render)
 * because the scope accessors throw when invoked during a render, and
 * getSnapshot returns the cached result.
 */
export const createInProcessClient = (): DevToolsClient => {
  let snapshot: DevToolsSnapshot = EMPTY_SNAPSHOT;

  const rebuild = () => {
    const apis = DevToolsHooks.getApis();
    const byId = new Map<number, ApiInfo>();
    for (const [id, entry] of apis) {
      try {
        byId.set(id, projectApi(id, entry));
      } catch {
        // Skip an api that fails to project rather than breaking the panel.
      }
    }
    // apiIds tracks byId so the selector never lists an id without data.
    snapshot = { apiIds: [...byId.keys()], byId };
  };

  return {
    subscribe(listener) {
      rebuild();
      return DevToolsHooks.subscribe(() => {
        rebuild();
        listener();
      });
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_SNAPSHOT,
    clearEvents: (apiId) => DevToolsHooks.clearEventLogs(apiId),
    switchToThread: (apiId, threadId) => {
      const entry = DevToolsHooks.getApis().get(apiId);
      const threads = entry?.api.threads;
      if (!threads || typeof threads !== "function") return;
      const methods = threads() as {
        switchToThread?: (id: string) => void | Promise<void>;
      };
      return methods.switchToThread?.(threadId);
    },
  };
};

/** Shared default client used by DevToolsModal and DevToolsPanel. */
export const inProcessClient = createInProcessClient();
