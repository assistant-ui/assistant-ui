import { AssistantApi } from "../context/react/AssistantApiContext";
import { Unsubscribe } from "@assistant-ui/tap";

export interface EventLog {
  time: Date;
  event: string;
  data: unknown;
}

interface ApiEntry {
  api: Partial<AssistantApi>;
  logs: EventLog[];
  unsubscribe?: Unsubscribe;
}

interface DevToolsHook {
  apis: Map<number, ApiEntry>;
  nextId: number;
}

declare global {
  interface Window {
    __ASSISTANT_UI_DEVTOOLS_HOOK__?: DevToolsHook;
  }
}

export class DevToolsHooks {
  private static instance: DevToolsHooks | null = null;
  private static readonly MAX_EVENT_LOGS_PER_API = 200;

  private readonly apiListeners = new Set<() => void>();
  private readonly eventListeners = new Map<number, Set<(logs: EventLog[]) => void>>();

  private constructor() {
    if (typeof window === "undefined") return;

    if (!window.__ASSISTANT_UI_DEVTOOLS_HOOK__) {
      window.__ASSISTANT_UI_DEVTOOLS_HOOK__ = {
        apis: new Map(),
        nextId: 1,
      };
    }
  }

  static getInstance(): DevToolsHooks {
    if (!DevToolsHooks.instance) {
      DevToolsHooks.instance = new DevToolsHooks();
    }
    return DevToolsHooks.instance;
  }

  private get hook(): DevToolsHook {
    if (typeof window === "undefined") {
      return { apis: new Map(), nextId: 1 };
    }
    return (
      window.__ASSISTANT_UI_DEVTOOLS_HOOK__ || { apis: new Map(), nextId: 1 }
    );
  }

  register(api: Partial<AssistantApi>): Unsubscribe {
    const hook = this.hook;

    for (const [_, entry] of hook.apis) {
      if (entry.api === api) {
        return () => {};
      }
    }

    const apiId = hook.nextId++;
    const entry: ApiEntry = {
      api,
      logs: [],
    };

    if (api.on) {
      try {
        entry.unsubscribe = api.on("*", (event: unknown) => {
          this.addEventLog(apiId, {
            time: new Date(),
            event: (event as any).type || "unknown",
            data: event,
          });
        });
      } catch (error) {
        console.warn("Failed to subscribe to events from API", error);
      }
    }

    hook.apis.set(apiId, entry);
    this.notifyApiListeners();

    return () => {
      const entry = hook.apis.get(apiId);
      if (!entry) return;

      if (entry.unsubscribe) {
        entry.unsubscribe();
      }

      hook.apis.delete(apiId);
      this.eventListeners.delete(apiId);

      this.notifyApiListeners();
    };
  }

  subscribe(listener: () => void): Unsubscribe {
    this.apiListeners.add(listener);
    return () => {
      this.apiListeners.delete(listener);
    };
  }

  subscribeToEvents(
    apiId: number,
    listener: (logs: EventLog[]) => void
  ): Unsubscribe {
    if (!this.eventListeners.has(apiId)) {
      this.eventListeners.set(apiId, new Set());
    }

    const listeners = this.eventListeners.get(apiId)!;
    listeners.add(listener);

    const entry = this.hook.apis.get(apiId);
    if (entry) {
      listener(entry.logs);
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(apiId);
      }
    };
  }

  subscribeToAllEvents(
    listener: (apiId: number, logs: EventLog[]) => void
  ): Unsubscribe {
    const unsubscribes: Unsubscribe[] = [];

    for (const [apiId, entry] of this.hook.apis) {
      listener(apiId, entry.logs);
    }

    const apiListener = () => {
      for (const [apiId, entry] of this.hook.apis) {
        listener(apiId, entry.logs);
      }
    };

    this.apiListeners.add(apiListener);

    return () => {
      this.apiListeners.delete(apiListener);
      unsubscribes.forEach((unsub) => unsub());
    };
  }

  private addEventLog(apiId: number, log: EventLog): void {
    const entry = this.hook.apis.get(apiId);
    if (!entry) return;

    entry.logs.push(log);

    if (entry.logs.length > DevToolsHooks.MAX_EVENT_LOGS_PER_API) {
      entry.logs = entry.logs.slice(-DevToolsHooks.MAX_EVENT_LOGS_PER_API);
    }

    this.notifyEventListeners(apiId);
  }

  clearEventLogs(apiId: number): void {
    const entry = this.hook.apis.get(apiId);
    if (!entry) return;

    entry.logs = [];
    this.notifyEventListeners(apiId);
  }

  clearAllEventLogs(): void {
    for (const [apiId, entry] of this.hook.apis) {
      entry.logs = [];
      this.notifyEventListeners(apiId);
    }
  }

  getApis(): Array<[number, Partial<AssistantApi>]> {
    const result: Array<[number, Partial<AssistantApi>]> = [];
    for (const [id, entry] of this.hook.apis) {
      result.push([id, entry.api]);
    }
    return result;
  }

  getApi(apiId: number): Partial<AssistantApi> | undefined {
    return this.hook.apis.get(apiId)?.api;
  }

  getEventLogs(apiId: number): EventLog[] {
    return this.hook.apis.get(apiId)?.logs || [];
  }

  getAllEventLogs(): Array<[number, EventLog[]]> {
    const result: Array<[number, EventLog[]]> = [];
    for (const [id, entry] of this.hook.apis) {
      result.push([id, entry.logs]);
    }
    return result;
  }

  private notifyApiListeners(): void {
    this.apiListeners.forEach((listener) => listener());
  }

  private notifyEventListeners(apiId: number): void {
    const listeners = this.eventListeners.get(apiId);
    if (!listeners) return;

    const entry = this.hook.apis.get(apiId);
    if (!entry) return;

    listeners.forEach((listener) => listener(entry.logs));
  }
}