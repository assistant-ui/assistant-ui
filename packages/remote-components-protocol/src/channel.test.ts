import { afterEach, describe, expect, it, vi } from "vitest";
import { Channel, FunctionProxies, FunctionTargets } from "./channel.js";
import { diffProps, propsFunctionPathSet } from "./codec.js";
import { encode } from "./codec.js";
import { RemoteComponentError } from "./errors.js";
import type {
  HostMethods,
  HostNotifications,
  RemoteMethods,
  RemoteNotifications,
} from "./messages.js";
import { validateFromHost, validateFromRemote } from "./validate.js";

type HostSide = Channel<
  HostNotifications,
  RemoteNotifications,
  RemoteMethods,
  HostMethods
>;
type RemoteSide = Channel<
  RemoteNotifications,
  HostNotifications,
  HostMethods,
  RemoteMethods
>;

const open: { close(): void }[] = [];
afterEach(() => {
  for (const c of open.splice(0)) c.close();
});

function pair(): { host: HostSide; remote: RemoteSide; invalid: unknown[] } {
  const { port1, port2 } = new MessageChannel();
  const invalid: unknown[] = [];
  const host: HostSide = new Channel(port1 as never, {
    validate: validateFromRemote,
    onInvalid: (m) => invalid.push(m),
  });
  const remote: RemoteSide = new Channel(port2 as never, {
    validate: validateFromHost,
    onInvalid: (m) => invalid.push(m),
  });
  open.push(host, remote);
  return { host, remote, invalid };
}

const tick = () => new Promise((r) => setTimeout(r, 10));

describe("Channel", () => {
  it("delivers notifications in order", async () => {
    const { host, remote } = pair();
    const seen: number[] = [];
    remote.on("rc/notifications/props-changed", (m) => seen.push(m.seq));
    for (let i = 1; i <= 5; i++)
      host.notify("rc/notifications/props-changed", {
        seq: i,
        set: {},
        del: [],
      });
    await tick();
    expect(seen).toEqual([1, 2, 3, 4, 5]);
  });

  it("drops invalid messages", async () => {
    const { host, remote, invalid } = pair();
    let got = 0;
    host.on("rc/notifications/size-changed", () => got++);
    remote.notify("rc/notifications/size-changed", {
      size: { width: 1, height: -5, minContent: 0, maxContent: 0 },
    });
    remote.notify("rc/notifications/size-changed", {
      size: { width: 1, height: NaN, minContent: 0, maxContent: 0 },
    });
    remote.notify("rc/notifications/size-changed", {
      size: { width: 1, height: 2, minContent: 0, maxContent: 0 },
    });
    await tick();
    expect(got).toBe(1);
    expect(invalid).toHaveLength(2);
  });

  it("resolves and rejects requests", async () => {
    const { host, remote } = pair();
    host.handle("rc/overlay/close", ({ id }) => {
      if (id === "bad") throw new RemoteComponentError("overlay", "nope");
      return null;
    });
    await expect(
      remote.request("rc/overlay/close", { id: "ok" }),
    ).resolves.toBeNull();
    const err = await remote
      .request("rc/overlay/close", { id: "bad" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RemoteComponentError);
    expect((err as RemoteComponentError).code).toBe("overlay");
  });

  it("answers unknown methods with an unsupported error", async () => {
    const { remote } = pair();
    const err = await remote
      .request("rc/overlay/close", { id: "x" })
      .catch((e: unknown) => e);
    expect((err as RemoteComponentError).code).toBe("unsupported");
  });

  it("rejects pending requests on close", async () => {
    const { host, remote } = pair();
    host.handle("rc/overlay/close", () => new Promise(() => {}));
    const p = remote.request("rc/overlay/close", { id: "a" });
    await tick();
    remote.close();
    const err = await p.catch((e: unknown) => e);
    expect((err as RemoteComponentError).code).toBe("closed");
    await expect(
      remote.request("rc/overlay/close", { id: "a" }),
    ).rejects.toMatchObject({ code: "closed" });
  });
});

describe("request ids", () => {
  it("refuses a request that reuses the id of one being served", async () => {
    const { port1, port2 } = new MessageChannel();
    const host: HostSide = new Channel(port1 as never, {
      validate: validateFromRemote,
    });
    open.push(host, { close: () => port2.close() });
    const signals: AbortSignal[] = [];
    host.handle("rc/overlay/close", (_p, { signal }) => {
      signals.push(signal);
      return new Promise(() => {});
    });
    const responses: unknown[] = [];
    port2.onmessage = (ev) => responses.push(ev.data);
    port2.postMessage({
      jsonrpc: "2.0",
      id: 7,
      method: "rc/overlay/close",
      params: { id: "a" },
    });
    port2.postMessage({
      jsonrpc: "2.0",
      id: 7,
      method: "rc/overlay/close",
      params: { id: "b" },
    });
    await tick();
    expect(signals).toHaveLength(1);
    expect(responses).toEqual([
      {
        jsonrpc: "2.0",
        id: 7,
        error: expect.objectContaining({
          code: -32600,
          data: expect.objectContaining({ code: "protocol" }),
        }),
      },
    ]);
    // The first call keeps its cancellation entry.
    port2.postMessage({
      jsonrpc: "2.0",
      method: "rc/notifications/cancelled",
      params: { requestId: 7 },
    });
    await tick();
    expect(signals[0]!.aborted).toBe(true);
  });
});

describe("function references", () => {
  it("calls the latest function at a path and returns its (async) result", async () => {
    const { host, remote } = pair();
    const targets = new FunctionTargets();
    let props: Record<string, unknown> = {
      onAdd: (a: number, b: number) => a + b,
    };
    targets.register("props", () => props);
    host.handle("rc/call", ({ ref, args }) => targets.invoke(ref, args));

    const proxies = new FunctionProxies((ref, args) =>
      remote.request("rc/call", { ref, args }),
    );
    const decoded = proxies.decode(
      "props",
      structuredClone(encode(props, { allowFunctions: true })),
    ) as { onAdd: (a: number, b: number) => Promise<number> };
    await expect(decoded.onAdd(2, 3)).resolves.toBe(5);

    props = { onAdd: async (a: number, b: number) => a * b };
    await expect(decoded.onAdd(2, 3)).resolves.toBe(6); // latest-ref semantics
    const again = proxies.decode(
      "props",
      structuredClone(encode(props, { allowFunctions: true })),
    ) as typeof decoded;
    expect(again.onAdd).toBe(decoded.onAdd); // stable identity

    props = {};
    await expect(decoded.onAdd(1, 1)).rejects.toMatchObject({
      code: "stale-function",
    });
  });

  it("serves only function paths that were sent", async () => {
    const { host, remote } = pair();
    const targets = new FunctionTargets();
    const deleteAll = vi.fn();
    const onSave = vi.fn(() => "saved");
    // A React element: its $$typeof symbol makes the prop unencodable, so it is never sent.
    const element = {
      $$typeof: Symbol.for("react.element"),
      type: () => null,
      props: { onClick: deleteAll },
    };
    const config = {};
    Object.defineProperty(config, "hidden", {
      value: deleteAll,
      enumerable: false,
    });
    const props: Record<string, unknown> = { onSave, icon: element, config };
    const { encoded } = diffProps(null, props, () => {});
    expect(Object.keys(encoded)).toEqual(["onSave", "config"]);
    const sent = propsFunctionPathSet(encoded);
    targets.register(
      "props",
      () => props,
      (path) => sent.has(JSON.stringify(path)),
    );
    host.handle("rc/call", ({ ref, args }) => targets.invoke(ref, args));
    const proxies = new FunctionProxies((ref, args) =>
      remote.request("rc/call", { ref, args }),
    );

    await expect(proxies.get("props", ["onSave"])()).resolves.toBe("saved");
    await expect(
      proxies.get("props", ["icon", "props", "onClick"])(),
    ).rejects.toMatchObject({ code: "stale-function" });
    await expect(
      proxies.get("props", ["icon", "type"])(),
    ).rejects.toMatchObject({ code: "stale-function" });
    await expect(
      proxies.get("props", ["config", "hidden"])(),
    ).rejects.toMatchObject({ code: "stale-function" });
    expect(deleteAll).not.toHaveBeenCalled();
  });

  it("propagates thrown errors with name and message", async () => {
    const { host, remote } = pair();
    const targets = new FunctionTargets();
    class ValidationError extends Error {
      override name = "ValidationError";
    }
    targets.register("props", () => ({
      f: () => {
        throw new ValidationError("bad input");
      },
    }));
    host.handle("rc/call", ({ ref, args }) => targets.invoke(ref, args));
    const proxies = new FunctionProxies((ref, args) =>
      remote.request("rc/call", { ref, args }),
    );
    const err = await proxies
      .get("props", ["f"])()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe("ValidationError");
    expect((err as Error).message).toBe("bad input");
  });

  it("rejects functions in arguments and return values", async () => {
    const { host, remote } = pair();
    const targets = new FunctionTargets();
    targets.register("props", () => ({
      f: () => () => 1,
      g: (x: unknown) => x,
    }));
    host.handle("rc/call", ({ ref, args }) => targets.invoke(ref, args));
    const proxies = new FunctionProxies((ref, args) =>
      remote.request("rc/call", { ref, args }),
    );
    await expect(proxies.get("props", ["f"])()).rejects.toMatchObject({
      code: "data",
    });
    await expect(proxies.get("props", ["g"])(() => 1)).rejects.toMatchObject({
      code: "data",
    });
  });

  it("passes Dates, Maps and undefined through calls", async () => {
    const { host, remote } = pair();
    const targets = new FunctionTargets();
    targets.register("props", () => ({ echo: (...a: unknown[]) => a }));
    host.handle("rc/call", ({ ref, args }) => targets.invoke(ref, args));
    const proxies = new FunctionProxies((ref, args) =>
      remote.request("rc/call", { ref, args }),
    );
    const out = (await proxies.get("props", ["echo"])(
      new Date(7),
      new Map([[1, 2]]),
      undefined,
    )) as [Date, Map<number, number>, undefined];
    expect(out[0].getTime()).toBe(7);
    expect(out[1].get(1)).toBe(2);
    expect(out).toHaveLength(3);
  });

  it("unknown scopes are stale", async () => {
    const targets = new FunctionTargets();
    const off = targets.register("overlay:1", () => ({ f: () => 1 }));
    off();
    await expect(
      targets.invoke({ scope: "overlay:1", path: ["f"] }, { v: [] }),
    ).rejects.toMatchObject({ code: "stale-function" });
  });

  it("dropScope forgets cached proxies", () => {
    const proxies = new FunctionProxies(async () => ({ v: null }));
    const a = proxies.get("overlay:1", ["f"]);
    proxies.dropScope("overlay:1");
    expect(proxies.get("overlay:1", ["f"])).not.toBe(a);
  });
});

describe("cancellation", () => {
  /** Remote calls a host function prop through proxies, like the runtime does. */
  function rpc(fn: (...args: unknown[]) => unknown) {
    const { host, remote } = pair();
    const targets = new FunctionTargets();
    targets.register("props", () => ({ fn }));
    host.handle("rc/call", ({ ref, args }, { signal }) =>
      targets.invoke(ref, args, signal),
    );
    const proxies = new FunctionProxies((ref, args, signal) =>
      remote.request("rc/call", { ref, args }, signal ? { signal } : {}),
    );
    return { host, remote, call: proxies.get("props", ["fn"]) };
  }

  it("an AbortSignal in the arguments cancels the call on both sides", async () => {
    let calleeReason: unknown = null;
    const { call } = rpc(async (q: unknown, opts: unknown) => {
      const signal = (opts as { signal: AbortSignal }).signal;
      expect(q).toBe("query");
      await new Promise((_, reject) =>
        signal.addEventListener("abort", () =>
          reject((calleeReason = signal.reason)),
        ),
      );
    });
    const ac = new AbortController();
    const p = call("query", { signal: ac.signal });
    await tick();
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    await tick();
    expect(calleeReason).toBeInstanceOf(RemoteComponentError);
    expect((calleeReason as RemoteComponentError).code).toBe("cancelled");
  });

  it("an already aborted signal rejects without calling", async () => {
    let called = false;
    const { call } = rpc(() => (called = true));
    const ac = new AbortController();
    ac.abort(new Error("stop"));
    await expect(call({ signal: ac.signal })).rejects.toThrow("stop");
    await tick();
    expect(called).toBe(false);
  });

  it("a completed call ignores a later abort", async () => {
    const { call } = rpc(async () => 42);
    const ac = new AbortController();
    await expect(call(ac.signal)).resolves.toBe(42);
    ac.abort();
  });

  it("closing the channel aborts calls being served", async () => {
    let aborted = false;
    const { host, call } = rpc(
      (s: unknown) =>
        new Promise(() =>
          (s as AbortSignal).addEventListener("abort", () => (aborted = true)),
        ),
    );
    const p = call(new AbortController().signal);
    p.catch(() => {});
    await tick();
    host.close();
    expect(aborted).toBe(true);
  });

  it("AbortSignals are refused outside call arguments", () => {
    expect(() =>
      encode({ s: new AbortController().signal }, { allowFunctions: true }),
    ).toThrow(/AbortSignal/);
  });
});

describe("forward compatibility", () => {
  it("drops unknown notifications silently and reports malformed known ones", async () => {
    const { port1, port2 } = new MessageChannel();
    const invalid: unknown[] = [];
    const host = new Channel(port1 as never, {
      validate: validateFromRemote,
      onInvalid: (m) => invalid.push(m),
    });
    open.push(host, { close: () => port2.close() });
    port2.postMessage({
      jsonrpc: "2.0",
      method: "rc/notifications/some-future-thing",
      params: { x: 1 },
    });
    const bad = {
      jsonrpc: "2.0",
      method: "rc/notifications/size-changed",
      params: { size: { width: "bad" } },
    };
    port2.postMessage(bad);
    await tick();
    expect(invalid).toEqual([bad]);
  });
});
