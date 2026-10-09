import { describe, expect, it, vi } from "vitest";
import {
  type ConnectionMessage,
  deserializeError,
  HostConnection,
  serializeError,
} from "./connection";

function setup() {
  const sent: ConnectionMessage[] = [];
  const connection = new HostConnection();
  const post = vi.fn((message: ConnectionMessage) => {
    sent.push(message);
  });
  connection.attach(post);
  return { connection, sent, post };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function dataCloneError() {
  return Object.assign(new Error("could not be cloned"), {
    name: "DataCloneError",
  });
}

describe("serializeError / deserializeError", () => {
  it("copies own properties, name and message but not the stack", () => {
    const error = Object.assign(new TypeError("boom"), { code: 42 });
    const serialized = serializeError(error);
    expect(serialized).toEqual({
      code: 42,
      name: "TypeError",
      message: "boom",
    });
    expect(serialized).not.toHaveProperty("stack");
  });

  it("rebuilds an Error from a message-bearing object", () => {
    const error = deserializeError({ message: "boom", code: 42 }) as Error & {
      code: number;
    };
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("boom");
    expect(error.code).toBe(42);
  });

  it("keeps a __proto__ key as an own property", () => {
    const value = JSON.parse(
      '{"message":"boom","__proto__":{"polluted":true}}',
    );
    const error = deserializeError(value) as Error;
    expect(Object.getPrototypeOf(error)).toBe(Error.prototype);
    expect(Object.hasOwn(error, "__proto__")).toBe(true);
  });

  it("passes other values through", () => {
    expect(deserializeError("nope")).toBe("nope");
    expect(deserializeError(null)).toBe(null);
    expect(deserializeError({ code: 1 })).toEqual({ code: 1 });
  });
});

describe("HostConnection", () => {
  it("queues calls until a transport is attached", async () => {
    const connection = new HostConnection();
    const post = vi.fn();
    const call = connection.callRemoteServiceMethod("runCode", "1+1");
    expect(post).not.toHaveBeenCalled();

    connection.attach(post);
    expect(post).toHaveBeenCalledWith({
      type: "service-message",
      callId: expect.any(String),
      methodName: "runCode",
      arguments: ["1+1"],
    });

    const { callId } = post.mock.calls[0]![0];
    connection.handle({ type: "response", callId, success: true, result: 2 });
    await expect(call).resolves.toBe(2);
  });

  it("rejects a call with a deserialized error", async () => {
    const { connection, sent } = setup();
    const call = connection.callRemoteMethod("fn", 1, 2);
    expect(sent[0]).toMatchObject({
      type: "message",
      methodName: "fn",
      arguments: [1, 2],
    });
    connection.handle({
      type: "response",
      callId: sent[0]!.callId,
      success: false,
      result: { name: "RangeError", message: "bad" },
    });
    await expect(call).rejects.toThrow("bad");
    await call.catch((error: Error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("RangeError");
    });
  });

  it("ignores malformed messages and unknown call ids", () => {
    const { connection, sent } = setup();
    connection.handle(null);
    connection.handle("text");
    connection.handle({ type: "response" });
    connection.handle({ type: "response", callId: "999", success: true });
    connection.handle({ type: "unknown", callId: "1" });
    expect(sent).toEqual([]);
  });

  it("resolves setLocalApi once the other side acknowledges", async () => {
    const { connection, sent } = setup();
    const api = { greet: () => "hi" };
    const done = connection.setLocalApi(api);
    expect(connection.localApi).toBe(api);
    expect(sent[0]).toMatchObject({
      type: "set-interface",
      apiMethods: ["greet"],
    });
    connection.handle({
      type: "response",
      callId: sent[0]!.callId,
      success: true,
    });
    await expect(done).resolves.toBeUndefined();
  });

  it("builds the remote proxy from set-interface and acknowledges it", async () => {
    const { connection, sent } = setup();
    connection.handle({
      type: "set-interface",
      callId: "7",
      apiMethods: ["sum", 3, "__proto__"],
    });
    await connection.remoteMethodsWaitPromise;
    expect(Object.keys(connection.remote)).toEqual(["sum", "__proto__"]);
    expect(Object.getPrototypeOf(connection.remote)).toBe(Object.prototype);
    expect(sent[0]).toEqual({
      type: "response",
      callId: "7",
      success: true,
      result: undefined,
    });

    const result = connection.remote["sum"]!(1, 2);
    expect(sent[1]).toMatchObject({
      type: "message",
      methodName: "sum",
      arguments: [1, 2],
    });
    connection.handle({
      type: "response",
      callId: sent[1]!.callId,
      success: true,
      result: 3,
    });
    await expect(result).resolves.toBe(3);
  });

  it("treats a set-interface without a method list as empty", () => {
    const { connection } = setup();
    connection.handle({ type: "set-interface", callId: "1" });
    expect(connection.remote).toEqual({});
  });

  it("answers calls to the local API with the API as `this`", async () => {
    const { connection, sent } = setup();
    const api = {
      factor: 3,
      triple(this: { factor: number }, n: number) {
        return this.factor * n;
      },
      async later() {
        return "async";
      },
    };
    void connection.setLocalApi(api as never);
    connection.handle({
      type: "message",
      callId: "a",
      methodName: "triple",
      arguments: [2],
    });
    connection.handle({
      type: "message",
      callId: "b",
      methodName: "later",
      arguments: "not-an-array",
    });
    await flush();
    expect(sent).toContainEqual({
      type: "response",
      callId: "a",
      success: true,
      result: 6,
    });
    expect(sent).toContainEqual({
      type: "response",
      callId: "b",
      success: true,
      result: "async",
    });
  });

  it("rejects calls to unexposed, non-function, or throwing methods", async () => {
    const { connection, sent } = setup();
    void connection.setLocalApi({
      value: 5 as never,
      fail() {
        throw new Error("sync failure");
      },
    });
    for (const [callId, methodName] of [
      ["1", "missing"],
      ["2", "toString"],
      ["3", "value"],
      ["4", "fail"],
      ["5", 12],
    ] as const) {
      connection.handle({ type: "message", callId, methodName, arguments: [] });
    }
    await flush();
    const results = Object.fromEntries(
      sent
        .filter((m) => m.type === "response")
        .map((m) => [m.callId, m.type === "response" && m.result]),
    );
    expect(results["1"]).toMatchObject({
      message: 'Websandbox: method "missing" is not exposed',
    });
    expect(results["2"]).toMatchObject({
      message: 'Websandbox: method "toString" is not exposed',
    });
    expect(results["3"]).toMatchObject({
      message: 'Websandbox: "value" is not a function',
    });
    expect(results["4"]).toMatchObject({
      name: "Error",
      message: "sync failure",
    });
    expect(results["5"]).toMatchObject({
      message: 'Websandbox: method "12" is not exposed',
    });
  });

  it("answers service messages from the registered service methods", async () => {
    const { connection, sent } = setup();
    const iframeInitialized = vi.fn(() => "ok");
    connection.setServiceMethods({ iframeInitialized });
    connection.handle({
      type: "service-message",
      callId: "s",
      methodName: "iframeInitialized",
      arguments: [],
    });
    await flush();
    expect(iframeInitialized).toHaveBeenCalled();
    expect(sent).toContainEqual({
      type: "response",
      callId: "s",
      success: true,
      result: "ok",
    });
  });

  it("falls back to a JSON copy when a result cannot be cloned", async () => {
    const connection = new HostConnection();
    const sent: ConnectionMessage[] = [];
    connection.attach((message) => {
      if (
        message.type === "response" &&
        typeof message.result === "object" &&
        message.result !== null &&
        "fn" in message.result
      ) {
        throw dataCloneError();
      }
      if (message.type === "response" && typeof message.result === "function") {
        throw dataCloneError();
      }
      sent.push(message);
    });
    void connection.setLocalApi({
      withFn: () => ({ a: 1, fn: () => {} }),
      onlyFn: () => () => {},
    });
    connection.handle({
      type: "message",
      callId: "1",
      methodName: "withFn",
      arguments: [],
    });
    connection.handle({
      type: "message",
      callId: "2",
      methodName: "onlyFn",
      arguments: [],
    });
    await flush();
    expect(sent).toContainEqual({
      type: "response",
      callId: "1",
      success: true,
      result: { a: 1 },
    });
    expect(sent).toContainEqual({
      type: "response",
      callId: "2",
      success: false,
      result: {
        name: "Error",
        message: "Websandbox: the result could not be cloned",
      },
    });
  });

  it("drops a response whose transport fails for another reason", () => {
    const connection = new HostConnection();
    const post = vi.fn(() => {
      throw new Error("port closed");
    });
    connection.attach(post);
    expect(() =>
      connection.handle({ type: "set-interface", callId: "1", apiMethods: [] }),
    ).not.toThrow();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("gives up when the clone-error fallback cannot be posted either", () => {
    const connection = new HostConnection();
    const post = vi.fn(() => {
      throw dataCloneError();
    });
    connection.attach(post);
    expect(() =>
      connection.handle({ type: "set-interface", callId: "1", apiMethods: [] }),
    ).not.toThrow();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("rejects a call whose message cannot be posted", async () => {
    const connection = new HostConnection();
    connection.attach(() => {
      throw dataCloneError();
    });
    await expect(
      connection.callRemoteMethod("fn", () => {}),
    ).rejects.toMatchObject({ name: "DataCloneError" });
  });

  it("drops responses after dispose", () => {
    const connection = new HostConnection();
    const post = vi.fn();
    connection.attach(post);
    connection.dispose(new Error("gone"));
    connection.handle({ type: "set-interface", callId: "1", apiMethods: [] });
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects pending and future calls after dispose", async () => {
    const connection = new HostConnection();
    const pending = connection.callRemoteMethod("queued");
    connection.dispose(new Error("destroyed"));
    await expect(pending).rejects.toThrow("destroyed");
    await expect(connection.callRemoteMethod("later")).rejects.toThrow(
      "destroyed",
    );
    const post = vi.fn();
    connection.attach(post);
    expect(post).not.toHaveBeenCalled();
  });
});
