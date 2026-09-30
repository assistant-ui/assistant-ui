import { afterEach, describe, expect, it, vi } from "vitest";
import {
  serveWebviewRoutes,
  type ServeWebviewRoutesOptions,
  type WebviewRoutes,
} from "../host/router";
import {
  VSCODE_BRIDGE_CHANNEL,
  VSCODE_VIRTUAL_ORIGIN,
  type BridgeMessage,
} from "../protocol";
import { createInMemoryBridge } from "../testUtils";
import { createVSCodeFetch } from "./fetch";

const encoder = new TextEncoder();
const disposers: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const setup = (
  routes: WebviewRoutes,
  options: ServeWebviewRoutesOptions = {},
) => {
  const bridge = createInMemoryBridge();
  const server = serveWebviewRoutes(bridge.webview, routes, options);
  disposers.push(() => server.dispose());
  return { bridge, server, fetch: createVSCodeFetch(bridge.port) };
};

const kinds = (messages: unknown[], kind: BridgeMessage["kind"]) =>
  (messages as BridgeMessage[]).filter((m) => m.kind === kind);

const streamOf = (parts: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    async pull(controller) {
      const part = parts.shift();
      if (!part) return controller.close();
      await new Promise((resolve) => setTimeout(resolve, 1));
      controller.enqueue(part);
    },
  });

const waitFor = async (predicate: () => boolean) => {
  await vi.waitFor(() => {
    if (!predicate()) throw new Error("condition not met");
  });
};

describe("vscodeFetch over serveWebviewRoutes", () => {
  it("streams chunks in order with their content intact", async () => {
    const parts = Array.from({ length: 20 }, (_, i) => `part-${i};`);
    const { fetch } = setup(
      {
        "/api/stream": {
          GET: () =>
            new Response(streamOf(parts.map((p) => encoder.encode(p)))),
        },
      },
      { flushInterval: 0 },
    );

    const response = await fetch("/api/stream");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const received: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received.push(decoder.decode(value, { stream: true }));
    }

    expect(received.join("")).toBe(parts.join(""));
    expect(received.length).toBeGreaterThan(1);
  });

  it("keeps multi-byte UTF-8 intact when a code point spans chunks", async () => {
    const text = "héllo 🌍 世界 ✓";
    const bytes = encoder.encode(text);
    const parts = Array.from(bytes, (byte) => Uint8Array.of(byte));
    const { fetch, bridge } = setup(
      { "/api/utf8": { GET: () => new Response(streamOf(parts)) } },
      { flushInterval: 0 },
    );

    const response = await fetch("/api/utf8");

    expect(await response.text()).toBe(text);
    expect(kinds(bridge.hostToWebview, "fetch:chunk")).toHaveLength(
      bytes.length,
    );
  });

  it("passes the request and response status, headers and body through", async () => {
    const seen: Request[] = [];
    const { fetch } = setup({
      "/api/echo": {
        POST: async (req) => {
          seen.push(req);
          return new Response(`echo:${await req.text()}`, {
            status: 201,
            statusText: "Created",
            headers: { "x-reply": "yes", "content-type": "text/plain" },
          });
        },
      },
    });

    const response = await fetch("/api/echo?q=1", {
      method: "POST",
      headers: { "x-request": "abc" },
      body: "payload",
    });

    expect(response.status).toBe(201);
    expect(response.statusText).toBe("Created");
    expect(response.headers.get("x-reply")).toBe("yes");
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("echo:payload");
    expect(seen[0]!.url).toBe(`${VSCODE_VIRTUAL_ORIGIN}/api/echo?q=1`);
    expect(seen[0]!.method).toBe("POST");
    expect(seen[0]!.headers.get("x-request")).toBe("abc");
  });

  it.each([
    ["Uint8Array", () => Uint8Array.of(1, 2, 255)],
    ["ArrayBuffer", () => Uint8Array.of(1, 2, 255).buffer],
    ["Blob", () => new Blob([Uint8Array.of(1, 2, 255)])],
  ])("sends a %s body as bytes", async (_, makeBody) => {
    const { fetch } = setup({
      "/api/bytes": {
        PUT: async (req) =>
          Response.json([...new Uint8Array(await req.arrayBuffer())]),
      },
    });

    const response = await fetch("/api/bytes", {
      method: "PUT",
      body: makeBody(),
    });

    expect(await response.json()).toEqual([1, 2, 255]);
  });

  it("accepts a Request object as input", async () => {
    const { fetch } = setup({
      "/api/json": { POST: async (req) => Response.json(await req.json()) },
    });

    const response = await fetch(
      new Request(`${VSCODE_VIRTUAL_ORIGIN}/api/json`, {
        method: "POST",
        body: JSON.stringify({ a: 1 }),
      }),
    );

    expect(await response.json()).toEqual({ a: 1 });
  });

  it("answers 404 for an unknown route", async () => {
    const { fetch } = setup({});

    const response = await fetch("/api/missing");

    expect(response.status).toBe(404);
  });

  it("answers 405 with an Allow header for an unsupported method", async () => {
    const { fetch } = setup({
      "/api/chat": { POST: () => new Response("ok") },
    });

    const response = await fetch("/api/chat");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("answers 500 and reports the error when a handler throws", async () => {
    const onError = vi.fn();
    const failure = new Error("boom");
    const { fetch } = setup(
      {
        "/api/fail": {
          GET: () => {
            throw failure;
          },
        },
      },
      { onError },
    );

    const response = await fetch("/api/fail");

    expect(response.status).toBe(500);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("errors the body when the response stream fails mid-way", async () => {
    const onError = vi.fn();
    const { fetch, bridge } = setup(
      {
        "/api/broken": {
          GET: () =>
            new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(encoder.encode("partial"));
                  setTimeout(() => controller.error(new Error("lost")), 20);
                },
              }),
            ),
        },
      },
      { onError },
    );

    const response = await fetch("/api/broken");

    await expect(response.text()).rejects.toThrow("lost");
    expect(kinds(bridge.hostToWebview, "fetch:error")).toHaveLength(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("returns a null body for a 204 response", async () => {
    const { fetch } = setup({
      "/api/empty": { DELETE: () => new Response(null, { status: 204 }) },
    });

    const response = await fetch("/api/empty", { method: "DELETE" });

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("aborts the handler's request signal and ends the stream on abort", async () => {
    let handlerSignal: AbortSignal | undefined;
    let cancelled = false;
    const { fetch, bridge } = setup({
      "/api/slow": {
        POST: (req) => {
          handlerSignal = req.signal;
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode("first"));
              },
              cancel() {
                cancelled = true;
              },
            }),
          );
        },
      },
    });
    const controller = new AbortController();

    const response = await fetch("/api/slow", {
      method: "POST",
      signal: controller.signal,
    });
    const reader = response.body!.getReader();
    const first = await reader.read();
    controller.abort();

    expect(new TextDecoder().decode(first.value)).toBe("first");
    await expect(reader.read()).rejects.toMatchObject({ name: "AbortError" });
    await waitFor(() => handlerSignal?.aborted === true && cancelled);
    expect(kinds(bridge.webviewToHost, "fetch:abort")).toHaveLength(1);
    expect(kinds(bridge.hostToWebview, "fetch:end")).toHaveLength(0);
  });

  it("rejects with an AbortError when aborted before the response head", async () => {
    let handlerSignal: AbortSignal | undefined;
    const { fetch } = setup({
      "/api/hang": {
        GET: (req) => {
          handlerSignal = req.signal;
          return new Promise<Response>(() => undefined);
        },
      },
    });
    const controller = new AbortController();

    const pending = fetch("/api/hang", { signal: controller.signal });
    await waitFor(() => handlerSignal !== undefined);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await waitFor(() => handlerSignal!.aborted);
  });

  it("rejects immediately for an already aborted signal", async () => {
    const { fetch, bridge } = setup({});

    await expect(
      fetch("/api/any", { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(bridge.webviewToHost).toHaveLength(0);
  });

  it("aborts the handler when the consumer cancels the body", async () => {
    let handlerSignal: AbortSignal | undefined;
    const { fetch } = setup({
      "/api/slow": {
        GET: (req) => {
          handlerSignal = req.signal;
          return new Response(new ReadableStream());
        },
      },
    });

    const response = await fetch("/api/slow");
    await response.body!.cancel();

    await waitFor(() => handlerSignal?.aborted === true);
  });

  it("coalesces small chunks produced within the flush interval", async () => {
    const { fetch, bridge } = setup({
      "/api/burst": {
        GET: () =>
          new Response(
            new ReadableStream({
              start(controller) {
                for (let i = 0; i < 10; i++) {
                  controller.enqueue(encoder.encode(`${i}`));
                }
                controller.close();
              },
            }),
          ),
      },
    });

    const response = await fetch("/api/burst");

    expect(await response.text()).toBe("0123456789");
    expect(kinds(bridge.hostToWebview, "fetch:chunk")).toHaveLength(1);
  });

  it("flushes as soon as the buffered size reaches flushSize", async () => {
    const { fetch, bridge } = setup(
      {
        "/api/burst": {
          GET: () =>
            new Response(
              new ReadableStream({
                start(controller) {
                  for (let i = 0; i < 5; i++) {
                    controller.enqueue(encoder.encode("abcd"));
                  }
                  controller.close();
                },
              }),
            ),
        },
      },
      { flushSize: 8, flushInterval: 1000 },
    );

    const response = await fetch("/api/burst");

    expect(await response.text()).toBe("abcd".repeat(5));
    const chunks = kinds(bridge.hostToWebview, "fetch:chunk") as {
      chunk: Uint8Array;
    }[];
    expect(chunks.map((c) => c.chunk.byteLength)).toEqual([8, 8, 4]);
  });

  it("keeps concurrent requests apart by id", async () => {
    const { fetch, bridge } = setup({
      "/api/delay": {
        GET: async (req) => {
          const ms = Number(new URL(req.url).searchParams.get("ms"));
          await new Promise((resolve) => setTimeout(resolve, ms));
          return new Response(`waited ${ms}`);
        },
      },
    });

    const results = await Promise.all(
      [30, 1, 15].map(async (ms) =>
        (await fetch(`/api/delay?ms=${ms}`)).text(),
      ),
    );

    expect(results).toEqual(["waited 30", "waited 1", "waited 15"]);
    const ids = kinds(bridge.webviewToHost, "fetch:request").map((m) => m.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("ignores messages from other channels", async () => {
    const handler = vi.fn(() => new Response("ok"));
    const { bridge, fetch } = setup({ "/api/x": { GET: handler } });

    bridge.port.postMessage({
      channel: "other",
      kind: "fetch:request",
      id: "1",
      url: `${VSCODE_VIRTUAL_ORIGIN}/api/x`,
      method: "GET",
      headers: [],
      body: null,
    } as never);
    bridge.postToWebview({ type: "unrelated" });
    const response = await fetch("/api/x");

    expect(await response.text()).toBe("ok");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("ignores host messages for unknown ids", async () => {
    const { bridge, fetch } = setup({
      "/api/x": { GET: () => new Response("ok") },
    });

    bridge.postToWebview({
      channel: VSCODE_BRIDGE_CHANNEL,
      kind: "fetch:error",
      id: "unknown",
      message: "nope",
    });

    expect(await (await fetch("/api/x")).text()).toBe("ok");
  });

  it("aborts in-flight handlers when disposed", async () => {
    let handlerSignal: AbortSignal | undefined;
    const { fetch, server } = setup({
      "/api/slow": {
        GET: (req) => {
          handlerSignal = req.signal;
          return new Response(new ReadableStream());
        },
      },
    });

    await fetch("/api/slow");
    server.dispose();

    expect(handlerSignal?.aborted).toBe(true);
  });
});
