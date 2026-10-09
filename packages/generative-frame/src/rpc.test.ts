import { describe, expect, it, vi } from "vitest";
import { createRpcPeer, RPC_ERROR, RpcError, type RpcEndpoint } from "./rpc";

type Listener = (event: MessageEvent) => void;

/** Two in-memory endpoints wired to each other, delivering asynchronously like a MessagePort. */
const createPair = () => {
  const make = () => {
    const listeners = new Set<Listener>();
    type Endpoint = RpcEndpoint & {
      other?: Endpoint;
      sent: unknown[];
      listeners: Set<Listener>;
    };
    const endpoint: Endpoint = {
      listeners,
      sent: [],
      postMessage(message) {
        endpoint.sent.push(message);
        const target = endpoint.other!;
        queueMicrotask(() => {
          for (const listener of target.listeners) {
            listener({ data: structuredClone(message) } as MessageEvent);
          }
        });
      },
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    return endpoint;
  };
  const a = make();
  const b = make();
  a.other = b;
  b.other = a;
  return [a, b] as const;
};

describe("createRpcPeer", () => {
  it("answers requests with the handler's result", async () => {
    const [a, b] = createPair();
    const client = createRpcPeer(a);
    createRpcPeer(b, {
      onRequest: (method, params) => ({ method, echo: params }),
    });
    await expect(client.request("genframe/inspect", { x: 1 })).resolves.toEqual(
      {
        method: "genframe/inspect",
        echo: { x: 1 },
      },
    );
  });

  it("answers null when a handler returns nothing", async () => {
    const [a, b] = createPair();
    const client = createRpcPeer(a);
    createRpcPeer(b, { onRequest: () => undefined });
    await expect(
      client.request("ui/open-link", { url: "https://x.dev" }),
    ).resolves.toBeNull();
  });

  it("rejects with the RpcError code the handler threw", async () => {
    const [a, b] = createPair();
    const client = createRpcPeer(a);
    createRpcPeer(b, {
      onRequest: () => {
        throw new RpcError(RPC_ERROR.invalidParams, "bad url", {
          field: "url",
        });
      },
    });
    const error = await client.request("ui/open-link").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RpcError);
    expect(error).toMatchObject({
      code: RPC_ERROR.invalidParams,
      message: "bad url",
      data: { field: "url" },
    });
  });

  it("maps plain errors to internal errors and missing handlers to method-not-found", async () => {
    const [a, b] = createPair();
    const client = createRpcPeer(a);
    createRpcPeer(b, {
      onRequest: async () => {
        throw new Error("boom");
      },
    });
    await expect(client.request("x")).rejects.toMatchObject({
      code: RPC_ERROR.internalError,
      message: "boom",
    });

    const [c, d] = createPair();
    const other = createRpcPeer(c);
    createRpcPeer(d);
    await expect(other.request("x")).rejects.toMatchObject({
      code: RPC_ERROR.methodNotFound,
    });
  });

  it("delivers notifications in order without responses", async () => {
    const [a, b] = createPair();
    const client = createRpcPeer(a);
    const received: unknown[] = [];
    createRpcPeer(b, {
      onNotification: (method, params) => received.push([method, params]),
    });
    client.notify("genframe/write", { chunk: "<p>" });
    client.notify("genframe/write", { chunk: "hi" });
    client.notify("genframe/end");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).toEqual([
      ["genframe/write", { chunk: "<p>" }],
      ["genframe/write", { chunk: "hi" }],
      ["genframe/end", undefined],
    ]);
    expect(b.sent).toEqual([]);
  });

  it("lets both sides call each other", async () => {
    const [a, b] = createPair();
    const host = createRpcPeer(a, { onRequest: () => "from host" });
    const frame = createRpcPeer(b, { onRequest: () => "from frame" });
    await expect(host.request("genframe/inspect")).resolves.toBe("from frame");
    await expect(frame.request("ui/message")).resolves.toBe("from host");
  });

  it("times out requests and rejects pending ones on dispose", async () => {
    vi.useFakeTimers();
    try {
      const [a] = createPair();
      const peer = createRpcPeer(a);
      const timed = peer.request("slow", undefined, { timeoutMs: 100 });
      const pending = peer.request("never");
      vi.advanceTimersByTime(100);
      await expect(timed).rejects.toThrow("slow timed out after 100ms");
      peer.dispose();
      await expect(pending).rejects.toThrow("disposed");
      await expect(peer.request("after")).rejects.toThrow("disposed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores non-JSON-RPC traffic and unknown response ids", async () => {
    const [a, b] = createPair();
    const onNotification = vi.fn();
    createRpcPeer(b, { onNotification });
    a.postMessage({ type: "genframe:ready" });
    a.postMessage({ jsonrpc: "2.0", id: 99, result: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNotification).not.toHaveBeenCalled();
  });

  it("routes replies for externally received requests through the given reply function", async () => {
    const [a] = createPair();
    const peer = createRpcPeer(a, { onRequest: () => ({ ok: true }) });
    const reply = vi.fn();
    peer.receive({ jsonrpc: "2.0", id: "w1", method: "ui/initialize" }, reply);
    await vi.waitFor(() =>
      expect(reply).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        id: "w1",
        result: { ok: true },
      }),
    );
    expect(a.sent).toEqual([]);
  });
});
