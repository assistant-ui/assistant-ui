import { describe, expect, it, vi } from "vitest";
import {
  VSCODE_BRIDGE_CHANNEL,
  VSCODE_VIRTUAL_ORIGIN,
  type FetchRequestMessage,
} from "../protocol";
import { createInMemoryBridge } from "../testUtils";
import { createVSCodeFetch } from "../webview/fetch";
import { serveRoutes } from "./router";

const waitFor = (predicate: () => boolean) =>
  vi.waitFor(() => {
    if (!predicate()) throw new Error("condition not met");
  });

const request = (id: string, method = "GET"): FetchRequestMessage => ({
  channel: VSCODE_BRIDGE_CHANNEL,
  kind: "fetch:request",
  id,
  url: `${VSCODE_VIRTUAL_ORIGIN}/api/test`,
  method,
  headers: [],
  body: null,
});

describe("serveRoutes", () => {
  it("flushes buffered bytes before reporting a response stream error", async () => {
    const bridge = createInMemoryBridge();
    const onError = vi.fn();
    const server = serveRoutes(
      bridge.webview,
      {
        "/api/test": {
          GET: () =>
            new Response(
              new ReadableStream({
                async start(controller) {
                  controller.enqueue(new TextEncoder().encode("partial"));
                  await new Promise((resolve) => setTimeout(resolve, 1));
                  controller.error(new Error("boom"));
                },
              }),
            ),
        },
      },
      { flushInterval: 1000, onError },
    );
    try {
      const reader = (
        await createVSCodeFetch(bridge.port)("/api/test")
      ).body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toBe(
        "partial",
      );
      await expect(reader.read()).rejects.toThrow("boom");
      expect(onError).toHaveBeenCalledOnce();
      expect(
        (bridge.hostToWebview as { kind: string }[]).map(
          (message) => message.kind,
        ),
      ).toEqual(["fetch:head", "fetch:chunk", "fetch:error"]);
    } finally {
      server.dispose();
    }
  });

  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "answers 405 for inherited method %s",
    async (method) => {
      const bridge = createInMemoryBridge();
      const onError = vi.fn();
      const server = serveRoutes(
        bridge.webview,
        { "/api/test": { GET: () => new Response("ok") } },
        { onError },
      );
      try {
        bridge.port.postMessage(request(method, method));
        await waitFor(() => bridge.hostToWebview.length > 0);
        expect(bridge.hostToWebview[0]).toMatchObject({
          kind: "fetch:head",
          status: 405,
          headers: expect.arrayContaining([["allow", "GET"]]),
        });
        expect(onError).not.toHaveBeenCalled();
      } finally {
        server.dispose();
      }
    },
  );

  it("reports disposal to a fetch waiting for its head", async () => {
    const bridge = createInMemoryBridge();
    let signal: AbortSignal | undefined;
    const server = serveRoutes(bridge.webview, {
      "/api/test": {
        GET: (req) => {
          signal = req.signal;
          return new Promise<Response>(() => undefined);
        },
      },
    });
    const pending = createVSCodeFetch(bridge.port)("/api/test");
    await waitFor(() => signal !== undefined);
    server.dispose();
    await expect(pending).rejects.toBeInstanceOf(TypeError);
    expect(signal?.aborted).toBe(true);
  });

  it("reports disposal to a response body reader", async () => {
    const bridge = createInMemoryBridge();
    const server = serveRoutes(bridge.webview, {
      "/api/test": { GET: () => new Response(new ReadableStream()) },
    });
    const response = await createVSCodeFetch(bridge.port)("/api/test");
    const pending = response.body!.getReader().read();
    server.dispose();
    await expect(pending).rejects.toBeInstanceOf(TypeError);
  });

  it("releases an aborted id even when its handler never settles", async () => {
    const bridge = createInMemoryBridge();
    const onError = vi.fn();
    let calls = 0;
    const server = serveRoutes(
      bridge.webview,
      {
        "/api/test": {
          GET: () => {
            calls++;
            return new Promise<Response>(() => undefined);
          },
        },
      },
      { onError },
    );
    try {
      bridge.port.postMessage({
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "fetch:abort",
        id: "missing",
      });
      bridge.port.postMessage(request("reused"));
      await waitFor(() => calls === 1);
      bridge.port.postMessage({
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "fetch:abort",
        id: "reused",
      });
      bridge.port.postMessage(request("reused"));
      await waitFor(() => calls === 2);
      expect(onError).not.toHaveBeenCalled();
      expect(bridge.hostToWebview).toHaveLength(0);
    } finally {
      server.dispose();
    }
  });

  it("keeps a reused id when the aborted handler settles later", async () => {
    const bridge = createInMemoryBridge();
    const onError = vi.fn();
    let release!: (response: Response) => void;
    let calls = 0;
    const server = serveRoutes(
      bridge.webview,
      {
        "/api/test": {
          GET: () => {
            calls++;
            return calls === 1
              ? new Promise<Response>((resolve) => {
                  release = resolve;
                })
              : new Promise<Response>(() => undefined);
          },
        },
      },
      { onError },
    );
    try {
      bridge.port.postMessage(request("reused"));
      await waitFor(() => calls === 1);
      bridge.port.postMessage({
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "fetch:abort",
        id: "reused",
      });
      bridge.port.postMessage(request("reused"));
      await waitFor(() => calls === 2);
      release(new Response());
      await new Promise((resolve) => setTimeout(resolve, 0));
      bridge.port.postMessage(request("reused"));
      await waitFor(() => onError.mock.calls.length === 1);
      expect(calls).toBe(2);
    } finally {
      server.dispose();
    }
  });
});
