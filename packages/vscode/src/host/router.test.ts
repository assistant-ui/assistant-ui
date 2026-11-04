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
  vi.waitFor(
    () => {
      if (!predicate()) throw new Error("condition not met");
    },
    { interval: 10 },
  );

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
  it("releases reset requests and ignores their late responses when an id is reused", async () => {
    const bridge = createInMemoryBridge();
    const requests: Request[] = [];
    const lateResponse = Promise.withResolvers<Response>();
    const cancelled = vi.fn();
    const onError = vi.fn();
    const server = serveRoutes(
      bridge.webview,
      {
        "/api/test": {
          GET: (req) => {
            requests.push(req);
            return requests.length === 1
              ? lateResponse.promise
              : new Promise<Response>(() => undefined);
          },
        },
      },
      { onError },
    );
    try {
      bridge.port.postMessage(request("reused"));
      bridge.port.postMessage(request("another"));
      await vi.waitFor(() => expect(requests).toHaveLength(2), {
        interval: 10,
      });
      bridge.port.postMessage({
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "fetch:reset",
        id: "",
      });
      bridge.port.postMessage(request("reused"));
      await vi.waitFor(() => expect(requests).toHaveLength(3), {
        interval: 10,
      });
      expect(requests[0]?.signal.aborted).toBe(true);
      expect(requests[1]?.signal.aborted).toBe(true);
      expect(requests[2]?.signal.aborted).toBe(false);

      lateResponse.resolve(
        new Response(new ReadableStream({ cancel: cancelled })),
      );
      await vi.waitFor(() => expect(cancelled).toHaveBeenCalledOnce(), {
        interval: 10,
      });
      expect(bridge.hostToWebview).toHaveLength(0);
      bridge.port.postMessage({
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "fetch:abort",
        id: "reused",
      });
      await vi.waitFor(() => expect(requests[2]?.signal.aborted).toBe(true), {
        interval: 10,
      });
      expect(onError).not.toHaveBeenCalled();
    } finally {
      server.dispose();
    }
  });

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

describe("serveRoutes input from the webview", () => {
  const setup = () => {
    const bridge = createInMemoryBridge();
    const onError = vi.fn();
    const handler = vi.fn(() => new Response("ok"));
    const server = serveRoutes(
      bridge.webview,
      { "/api/test": { GET: handler } },
      { onError },
    );
    const answersFor = (id: string) =>
      (bridge.hostToWebview as { id: string; kind: string }[]).filter(
        (message) => message.id === id,
      );
    return { bridge, onError, handler, server, answersFor };
  };

  it.each([
    "https://169.254.169.254/api/test",
    "http://localhost:3000/api/test",
  ])("refuses a request for %s instead of routing it", async (url) => {
    const { bridge, onError, handler, server, answersFor } = setup();
    try {
      bridge.port.postMessage({ ...request("foreign"), url });
      await waitFor(() => answersFor("foreign").length > 0);

      expect(answersFor("foreign")).toEqual([
        {
          channel: VSCODE_BRIDGE_CHANNEL,
          kind: "fetch:error",
          id: "foreign",
          message: `Refused a request for ${new URL(url).origin}`,
        },
      ]);
      expect(handler).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledOnce();
    } finally {
      server.dispose();
    }
  });

  it.each<[string, Partial<FetchRequestMessage>]>([
    ["a URL that does not parse", { url: "not a url" }],
    ["an invalid method", { method: "GET /api/test" }],
    ["a forbidden method", { method: "CONNECT" }],
    ["an invalid header name", { headers: [["bad header", "x"]] }],
  ])("answers fetch:error for %s without routing it", async (_, fields) => {
    const { bridge, handler, server, answersFor } = setup();
    try {
      bridge.port.postMessage({ ...request("bad"), ...fields });
      await waitFor(() => answersFor("bad").length > 0);

      expect(answersFor("bad")).toEqual([
        expect.objectContaining({ kind: "fetch:error" }),
      ]);
      expect(handler).not.toHaveBeenCalled();
    } finally {
      server.dispose();
    }
  });

  it("ignores messages whose fields do not match their kind", async () => {
    const { bridge, onError, handler, server, answersFor } = setup();
    const malformed: unknown[] = [
      null,
      "fetch:request",
      { ...request("channel"), channel: "other" },
      { ...request("id"), id: 1 },
      { ...request("kind"), kind: "fetch:unknown" },
      { ...request("inherited-kind"), kind: "toString" },
      { ...request("url"), url: 42 },
      { ...request("method"), method: null },
      { ...request("header-pair"), headers: [["only-a-name"]] },
      { ...request("header-value"), headers: [["x-a", 1]] },
      { ...request("headers-object"), headers: { "x-a": "1" } },
      { ...request("body"), method: "POST", body: "text" },
    ];
    try {
      for (const message of malformed) {
        bridge.port.postMessage(message as FetchRequestMessage);
      }
      bridge.port.postMessage(request("valid"));
      await waitFor(() =>
        answersFor("valid").some((message) => message.kind === "fetch:end"),
      );

      expect(handler).toHaveBeenCalledOnce();
      expect(onError).not.toHaveBeenCalled();
      expect(bridge.hostToWebview).toEqual(answersFor("valid"));
    } finally {
      server.dispose();
    }
  });
});
