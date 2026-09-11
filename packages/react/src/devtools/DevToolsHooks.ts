import type { Unsubscribe } from "@assistant-ui/core";
import { notifyEventListeners } from "@assistant-ui/core/internal";
import type { AssistantClient } from "@assistant-ui/store";

export interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

interface DevToolsApiEntry {
  api: Partial<AssistantClient>;
  logs: EventLog[];
}

interface DevToolsHook {
  apis: Map<number, DevToolsApiEntry>;
  nextId: number;
  listeners: Set<(apiId: number) => void>;
}

declare global {
  interface Window {
    __ASSISTANT_UI_DEVTOOLS_HOOK__?: DevToolsHook;
  }
}

let cachedHook: DevToolsHook | undefined;

const getHook = (): DevToolsHook => {
  if (cachedHook) {
    return cachedHook;
  }

  const createHook = (): DevToolsHook => ({
    apis: new Map(),
    nextId: 0,
    listeners: new Set(),
  });

  if (typeof window === "undefined") {
    cachedHook = createHook();
    return cachedHook;
  }

  const existingHook = window.__ASSISTANT_UI_DEVTOOLS_HOOK__;
  if (existingHook) {
    cachedHook = existingHook;
    return existingHook;
  }

  const newHook = createHook();
  window.__ASSISTANT_UI_DEVTOOLS_HOOK__ = newHook;
  cachedHook = newHook;
  return newHook;
};

const notifyListeners = (apiId: number): void => {
  notifyEventListeners(getHook().listeners, apiId, "DevTools");
};

export class DevToolsHooks {
  static subscribe(listener: () => void): Unsubscribe {
    const hook = getHook();
    hook.listeners.add(listener);
    return () => {
      hook.listeners.delete(listener);
    };
  }

  static clearEventLogs(apiId: number): void {
    const hook = getHook();
    const entry = hook.apis.get(apiId);
    if (!entry) return;

    entry.logs = [];
    notifyListeners(apiId);
  }

  static getApis(): Map<number, DevToolsApiEntry> {
    return getHook().apis;
  }
}

export class DevToolsProviderApi {
  private static readonly MAX_EVENT_LOGS_PER_API = 200;

  static register(aui: Partial<AssistantClient>): Unsubscribe {
    const hook = getHook();

    for (const entry of hook.apis.values()) {
      if (entry.api === aui) {
        return () => {};
      }
    }

    const apiId = hook.nextId++;
    const entry: DevToolsApiEntry = {
      api: aui,
      logs: [],
    };

    const eventUnsubscribe = aui.on?.("*", (e) => {
      const entry = hook.apis.get(apiId);
      if (!entry) return;

      entry.logs.push({
        time: new Date(),
        event: e.event,
        data: e.payload,
      });

      if (entry.logs.length > DevToolsProviderApi.MAX_EVENT_LOGS_PER_API) {
        entry.logs = entry.logs.slice(
          -DevToolsProviderApi.MAX_EVENT_LOGS_PER_API,
        );
      }

      notifyListeners(apiId);
    });

    const stateUnsubscribe = aui.subscribe?.(() => {
      notifyListeners(apiId);
    });

    hook.apis.set(apiId, entry);
    notifyListeners(apiId);

    return () => {
      const hook = getHook();
      const entry = hook.apis.get(apiId);
      if (!entry) return;

      eventUnsubscribe?.();
      stateUnsubscribe?.();

      hook.apis.delete(apiId);

      notifyListeners(apiId);
    };
  }
}
