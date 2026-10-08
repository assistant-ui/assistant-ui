import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  });

  it("lets vscodeFetch be imported without the API present", async () => {
    const { vscodeFetch } = await import("./fetch");

    expect(typeof vscodeFetch).toBe("function");
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
