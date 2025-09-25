import { AssistantApi } from "../context/react/AssistantApiContext";
import { Unsubscribe } from "@assistant-ui/tap";

export interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

interface DevToolsApiEntry {
  api: Partial<AssistantApi>;
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
    DevToolsHooks.notifyListeners(apiId);
  }

  static getApis(): Map<number, DevToolsApiEntry> {
    return getHook().apis;
  }

  private static notifyListeners(apiId: number): void {
    const hook = getHook();
    hook.listeners.forEach((listener) => listener(apiId));
  }
}

export class DevToolsProviderApi {
  private static readonly MAX_EVENT_LOGS_PER_API = 200;

  static register(api: Partial<AssistantApi>): Unsubscribe {
    const hook = getHook();

    for (const entry of hook.apis.values()) {
      if (entry.api === api) {
        return () => {};
      }
    }

    const apiId = hook.nextId++;
    const entry: DevToolsApiEntry = {
      api,
      logs: [],
    };

    const eventUnsubscribe = api.on?.("*", (e) => {
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

      DevToolsProviderApi.notifyListeners(apiId);
    });

    const stateUnsubscribe = api.subscribe?.(() => {
      DevToolsProviderApi.notifyListeners(apiId);
    });

    hook.apis.set(apiId, entry);
    DevToolsProviderApi.notifyListeners(apiId);

    return () => {
      const hook = getHook();
      const entry = hook.apis.get(apiId);
      if (!entry) return;

      eventUnsubscribe?.();
      stateUnsubscribe?.();

      hook.apis.delete(apiId);

      DevToolsProviderApi.notifyListeners(apiId);
    };
  }

  private static notifyListeners(apiId: number): void {
    const hook = getHook();
    hook.listeners.forEach((listener) => listener(apiId));
  }
}
