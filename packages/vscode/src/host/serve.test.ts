import { afterEach, describe, expect, it, vi } from "vitest";
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
