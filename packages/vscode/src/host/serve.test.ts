import { afterEach, describe, expect, it, vi } from "vitest";
import { VSCODE_BRIDGE_CHANNEL, type RpcRequestMessage } from "../protocol";
import { createInMemoryBridge } from "../testUtils";
import { createVSCodeFetch } from "../webview/fetch";
import { callHost } from "../webview/rpc";
import {
  serveWebviewHost,
  serveWebviewRoutes,
  type ServeWebviewHostOptions,
} from "./serve";

const disposers: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const setup = (options: ServeWebviewHostOptions = {}) => {
  const bridge = createInMemoryBridge();
  const host = serveWebviewHost(bridge.webview, options);
  disposers.push(() => host.dispose());
  return { bridge, host };
};

describe("serveWebviewHost", () => {
  it("serves routes like serveWebviewRoutes", async () => {
    const { bridge } = setup({
      routes: { "/api/ping": { GET: () => new Response("pong") } },
    });

    const response = await createVSCodeFetch(bridge.port)("/api/ping");

    expect(await response.text()).toBe("pong");
  });

  it("opens an allowed URL and returns the callback's result", async () => {
    const openExternal = vi.fn(async () => false);
    const { bridge } = setup({ openExternal });

    await expect(
      callHost(bridge.port, "openExternal", ["https://example.com/a b"]),
    ).resolves.toBe(false);
    expect(openExternal).toHaveBeenCalledWith("https://example.com/a%20b");
  });

  it("treats a callback without a result as opened", async () => {
    const { bridge } = setup({ openExternal: () => undefined });

    await expect(
      callHost(bridge.port, "openExternal", ["mailto:a@example.com"]),
    ).resolves.toBe(true);
  });

  it.each([
    "file:///etc/passwd",
    "javascript:alert(1)",
    "command:workbench.action.quit",
    "vscode://settings",
    "/relative",
    42,
  ])("refuses to open %s", async (url) => {
    const openExternal = vi.fn();
    const { bridge } = setup({ openExternal });

    await expect(callHost(bridge.port, "openExternal", [url])).rejects.toThrow(
      "Refused to open",
    );
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("checks URLs against externalSchemes", async () => {
    const openExternal = vi.fn();
    const { bridge } = setup({ openExternal, externalSchemes: ["https:"] });

    await expect(
      callHost(bridge.port, "openExternal", ["http://example.com/"]),
    ).rejects.toThrow("Refused to open");
    await callHost(bridge.port, "openExternal", ["https://example.com/"]);
    expect(openExternal).toHaveBeenCalledOnce();
  });

  it("rejects a method the host does not serve", async () => {
    const { bridge } = setup();

    await expect(
      callHost(bridge.port, "openExternal", ["https://example.com/"]),
    ).rejects.toThrow("openExternal is not served by this host");
  });

  it("propagates a callback failure", async () => {
    const { bridge } = setup({
      openExternal: () => Promise.reject(new Error("no browser")),
    });

    await expect(
      callHost(bridge.port, "openExternal", ["https://example.com/"]),
    ).rejects.toThrow("no browser");
  });

  it("rejects host calls still in flight when disposed", async () => {
    let finish: (opened: boolean) => void = () => {};
    const { bridge, host } = setup({
      openExternal: () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    });

    const call = callHost(bridge.port, "openExternal", [
      "https://example.com/",
    ]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    host.dispose();
    finish(true);

    await expect(call).rejects.toThrow("Webview host disposed");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.hostToWebview).toHaveLength(1);
  });

  it("ignores a host call that reuses an in-flight id", async () => {
    let finish: (opened: boolean) => void = () => {};
    const openExternal = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const { bridge } = setup({ openExternal });
    const call: RpcRequestMessage = {
      channel: VSCODE_BRIDGE_CHANNEL,
      kind: "rpc:request",
      id: "rpc-1",
      method: "openExternal",
      params: ["https://example.com/"],
    };

    bridge.port.postMessage(call);
    bridge.port.postMessage(call);
    await new Promise((resolve) => setTimeout(resolve, 0));
    finish(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(openExternal).toHaveBeenCalledOnce();
    expect(bridge.hostToWebview).toEqual([
      {
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "rpc:response",
        id: "rpc-1",
        ok: true,
        result: true,
      },
    ]);
  });

  it("stops answering after dispose", async () => {
    const openExternal = vi.fn();
    const { bridge, host } = setup({ openExternal });
    host.dispose();

    void callHost(bridge.port, "openExternal", ["https://example.com/"]);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(openExternal).not.toHaveBeenCalled();
    expect(bridge.hostToWebview).toHaveLength(0);
  });
});

describe("serveWebviewRoutes", () => {
  it("rejects host calls instead of leaving them unanswered", async () => {
    const bridge = createInMemoryBridge();
    const server = serveWebviewRoutes(bridge.webview, {
      "/api/ping": { GET: () => new Response("pong") },
    });
    disposers.push(() => server.dispose());

    expect(
      await (await createVSCodeFetch(bridge.port)("/api/ping")).text(),
    ).toBe("pong");
    await expect(
      callHost(bridge.port, "storage.getItem", ["threads"]),
    ).rejects.toThrow("storage.getItem is not served by this host");
  });
});
