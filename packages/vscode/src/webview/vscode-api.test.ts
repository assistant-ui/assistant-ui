import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serveRoutes } from "../host/router";
import { createInMemoryBridge } from "../testUtils";

const globals = globalThis as {
  acquireVsCodeApi?: () => unknown;
  addEventListener?: EventTarget["addEventListener"];
  removeEventListener?: EventTarget["removeEventListener"];
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  delete globals.acquireVsCodeApi;
  delete globals.addEventListener;
  delete globals.removeEventListener;
});

describe("getVSCodeApi", () => {
  it("throws outside a VS Code webview", async () => {
    const { getVSCodeApi } = await import("./vscode-api");

    expect(() => getVSCodeApi()).toThrow(/acquireVsCodeApi/);
  });

  it("acquires the API once and reuses it", async () => {
    const api = { postMessage: vi.fn(), getState: vi.fn(), setState: vi.fn() };
    const acquire = vi.fn(() => api);
    globals.acquireVsCodeApi = acquire;
    const { getVSCodeApi } = await import("./vscode-api");

    expect(getVSCodeApi()).toBe(api);
    expect(getVSCodeApi()).toBe(api);
    expect(acquire).toHaveBeenCalledOnce();
    expect(api.postMessage).toHaveBeenCalledExactlyOnceWith({
      channel: "aui-vscode",
      kind: "fetch:reset",
      id: "",
    });
  });

  it("lets vscodeFetch be imported without the API present", async () => {
    const { vscodeFetch } = await import("./fetch");

    expect(typeof vscodeFetch).toBe("function");
  });

  it("cancels the previous page's streams once when a new page acquires the API", async () => {
    const bridge = createInMemoryBridge();
    const requests: Request[] = [];
    const cancelled = vi.fn();
    const server = serveRoutes(bridge.webview, {
      "/api/stream": {
        GET: (request) => {
          requests.push(request);
          return new Response(new ReadableStream({ cancel: cancelled }));
        },
      },
    });
    const pages: EventTarget[] = [];
    const disconnect = bridge.port.onMessage((data) => {
      pages.at(-1)?.dispatchEvent(new MessageEvent("message", { data }));
    });
    const loadPage = async () => {
      const page = new EventTarget();
      pages.push(page);
      globals.addEventListener = page.addEventListener.bind(page);
      globals.removeEventListener = page.removeEventListener.bind(page);
      globals.acquireVsCodeApi = () => ({
        postMessage: bridge.port.postMessage,
      });
      vi.resetModules();
      return import("./fetch");
    };

    try {
      const firstPage = await loadPage();
      await firstPage.vscodeFetch("/api/stream");
      expect(requests[0]?.signal.aborted).toBe(false);

      const nextPage = await loadPage();
      const response = await nextPage.vscodeFetch("/api/stream");
      await vi.waitFor(() => {
        expect(requests[0]?.signal.aborted).toBe(true);
        expect(cancelled).toHaveBeenCalledOnce();
      });
      expect(requests[1]?.signal.aborted).toBe(false);

      await nextPage.createVSCodeFetch()("/api/stream");
      expect(requests[1]?.signal.aborted).toBe(false);
      expect(requests[2]?.signal.aborted).toBe(false);
      await response.body!.cancel();
      await vi.waitFor(() => expect(requests[1]?.signal.aborted).toBe(true));
      expect(requests[2]?.signal.aborted).toBe(false);
    } finally {
      disconnect();
      server.dispose();
    }
  });

  it("sends vscodeFetch through the webview API and window messages", async () => {
    const window = new EventTarget();
    globals.addEventListener = window.addEventListener.bind(window);
    globals.removeEventListener = window.removeEventListener.bind(window);
    const reply = (data: unknown) =>
      window.dispatchEvent(new MessageEvent("message", { data }));
    globals.acquireVsCodeApi = () => ({
      postMessage: (message: { kind: string; id: string }) => {
        if (message.kind !== "fetch:request") return;
        const base = { channel: "aui-vscode", id: message.id };
        queueMicrotask(() => {
          reply({
            ...base,
            kind: "fetch:head",
            status: 200,
            statusText: "OK",
            headers: [],
          });
          reply({
            ...base,
            kind: "fetch:chunk",
            chunk: new TextEncoder().encode("hi"),
          });
          reply({ ...base, kind: "fetch:end" });
        });
      },
    });
    const { vscodeFetch } = await import("./fetch");

    const response = await vscodeFetch("/api/hello");

    expect(await response.text()).toBe("hi");
  });
});
