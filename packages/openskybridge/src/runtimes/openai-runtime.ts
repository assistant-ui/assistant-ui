// This file is compiled separately and injected into the iframe
// It creates window.openai and handles postMessage communication

declare global {
  interface Window {
    openai: unknown;
  }
}

interface OpenAiState {
  theme: string;
  userAgent: { device: { type: string }; capabilities: { hover: boolean; touch: boolean } };
  locale: string;
  maxHeight: number;
  displayMode: string;
  safeArea: { insets: { top: number; bottom: number; left: number; right: number } };
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
}

const state: OpenAiState = {
  theme: "light",
  userAgent: { device: { type: "unknown" }, capabilities: { hover: false, touch: false } },
  locale: "en-US",
  maxHeight: 0,
  displayMode: "inline",
  safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  toolInput: {},
  toolOutput: null,
  toolResponseMetadata: null,
  widgetState: null,
};

const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let requestId = 0;

function call(method: string, args?: unknown): void {
  window.parent.postMessage({ type: "openskybridge.call", method, args }, "*");
}

function request<T>(method: string, args: unknown): Promise<T> {
  const id = String(++requestId);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    window.parent.postMessage({ type: "openskybridge.request", id, method, args }, "*");
  });
}

const api = {
  callTool: (name: string, args: Record<string, unknown>) => request("callTool", { name, args }),
  requestClose: () => call("requestClose"),
  sendFollowUpMessage: (args: { prompt: string }) => request("sendFollowUpMessage", args),
  openExternal: (payload: { href: string }) => call("openExternal", payload),
  requestDisplayMode: (args: { mode: string }) => request<{ mode: string }>("requestDisplayMode", args),
  setWidgetState: (widgetState: Record<string, unknown>) => request("setWidgetState", widgetState),
};

window.openai = new Proxy({}, {
  get(_, prop: string) {
    if (prop in api) return api[prop as keyof typeof api];
    if (prop in state) return state[prop as keyof OpenAiState];
    return undefined;
  },
  set() { return false; }
});

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "openskybridge.state") {
    Object.assign(state, data.state);
    window.dispatchEvent(new CustomEvent("openai:set_globals", { detail: { globals: data.state } }));
  }

  if (data.type === "openskybridge.response") {
    const p = pending.get(data.id);
    if (p) {
      pending.delete(data.id);
      if (data.error) p.reject(new Error(data.error.message));
      else p.resolve(data.result);
    }
  }
});

export {};
