import { afterEach, describe, expect, it, vi } from "vitest";
import { HostConnection } from "./connection";
import {
  CONNECT_MESSAGE,
  frameRuntimeScript,
  HELLO_MESSAGE,
} from "./frameRuntime";

const PARENT = "https://host.example";

type FrameGlobal = {
  connection: {
    remote: Record<string, (...args: unknown[]) => Promise<unknown>>;
    localApi: object;
    setLocalApi(api: object): Promise<void>;
    remoteMethodsWaitPromise: Promise<void>;
  };
  runCode(code: string): void;
};

const ports: MessagePort[] = [];

afterEach(() => {
  for (const port of ports.splice(0)) port.close();
  delete (window as { Websandbox?: unknown }).Websandbox;
  document.head.innerHTML = "";
});

function connectEvent(
  data: unknown,
  {
    origin = PARENT,
    source = window as MessageEventSource | null,
    port = null as MessagePort | null,
  } = {},
) {
  const event = new MessageEvent("message", { data, origin, source });
  Object.defineProperty(event, "ports", { value: port ? [port] : [] });
  return event;
}

function bootFrame(token = "token-1") {
  const postToParent = vi
    .spyOn(window, "postMessage")
    .mockImplementation(() => {});
  new Function(frameRuntimeScript(PARENT, token))();
  const parentMessages = [...postToParent.mock.calls];
  postToParent.mockRestore();
  const frame = (window as unknown as { Websandbox: FrameGlobal }).Websandbox;
  return { frame, parentMessages, token };
}

function connectHost(token: string) {
  const channel = new MessageChannel();
  ports.push(channel.port1, channel.port2);
  const host = new HostConnection();
  const iframeInitialized = vi.fn();
  host.setServiceMethods({ iframeInitialized });
  channel.port1.onmessage = (event) => host.handle(event.data);
  host.attach((message) => channel.port1.postMessage(message));
  window.dispatchEvent(
    connectEvent({ type: CONNECT_MESSAGE, token }, { port: channel.port2 }),
  );
  return { host, iframeInitialized };
}

function boot() {
  const booted = bootFrame();
  return { ...booted, ...connectHost(booted.token) };
}

describe("frameRuntimeScript", () => {
  it("escapes markup in its arguments", () => {
    const script = frameRuntimeScript("</script><b>", "t");
    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c/script>");
  });

  it("installs Websandbox and announces itself to the parent origin", () => {
    const { frame, parentMessages, token } = bootFrame();
    expect(parentMessages).toEqual([[{ type: HELLO_MESSAGE, token }, PARENT]]);
    expect(frame.connection.remote).toEqual({});
  });

  it("keeps an existing window.Websandbox", () => {
    const existing = { custom: true };
    (window as unknown as { Websandbox: unknown }).Websandbox = existing;
    bootFrame();
    expect((window as unknown as { Websandbox: unknown }).Websandbox).toBe(
      existing,
    );
  });

  it("calls iframeInitialized once the parent connects", async () => {
    const { iframeInitialized } = boot();
    await vi.waitFor(() => expect(iframeInitialized).toHaveBeenCalled());
  });

  it("ignores connect messages from the wrong origin, source, token or without a port", async () => {
    const { token } = bootFrame();
    const channel = new MessageChannel();
    ports.push(channel.port1, channel.port2);
    const received = vi.fn();
    channel.port1.onmessage = received;
    const port = channel.port2;

    window.dispatchEvent(
      connectEvent(
        { type: CONNECT_MESSAGE, token },
        { origin: "https://evil.example", port },
      ),
    );
    window.dispatchEvent(
      connectEvent({ type: CONNECT_MESSAGE, token }, { source: null, port }),
    );
    window.dispatchEvent(
      connectEvent({ type: CONNECT_MESSAGE, token: "other" }, { port }),
    );
    window.dispatchEvent(connectEvent({ type: "other", token }, { port }));
    window.dispatchEvent(connectEvent(null, { port }));
    window.dispatchEvent(connectEvent({ type: CONNECT_MESSAGE, token }));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(received).not.toHaveBeenCalled();
  });

  it("exposes the host API as connection.remote", async () => {
    const { frame, host } = boot();
    await host.setLocalApi({
      add: (a: number, b: number) => a + b,
      fail: () => {
        throw Object.assign(new Error("host failure"), { code: 7 });
      },
    });
    await frame.connection.remoteMethodsWaitPromise;
    await expect(frame.connection.remote["add"]!(2, 3)).resolves.toBe(5);
    const failure = await frame.connection.remote["fail"]!().catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toMatchObject({ message: "host failure", code: 7 });
  });

  it("exposes setLocalApi to the host", async () => {
    const { frame, host } = boot();
    const api = {
      prefix: "frame:",
      echo(this: { prefix: string }, value: string) {
        return this.prefix + value;
      },
      async fail() {
        throw new Error("frame failure");
      },
      rejectWithString() {
        return Promise.reject("plain");
      },
      cloneable: () => ({ ok: true, fn: () => {} }),
      uncloneable: () => () => {},
    };
    await frame.connection.setLocalApi(api);
    expect(frame.connection.localApi).toBe(api);
    await host.remoteMethodsWaitPromise;

    await expect(host.remote["echo"]!("hi")).resolves.toBe("frame:hi");
    await expect(host.remote["fail"]!()).rejects.toThrow("frame failure");
    await expect(host.remote["rejectWithString"]!()).rejects.toBe("plain");
    await expect(host.remote["cloneable"]!()).resolves.toEqual({ ok: true });
    await expect(host.remote["uncloneable"]!()).rejects.toThrow(
      "Websandbox: the result could not be cloned",
    );
    await expect(host.callRemoteMethod("prefix")).rejects.toThrow(
      'Websandbox: "prefix" is not a function',
    );
    await expect(host.callRemoteMethod("missing")).rejects.toThrow(
      'Websandbox: method "missing" is not exposed',
    );
  });

  it("queues frame calls made before the parent connects", async () => {
    const { frame, token } = bootFrame();
    const pending = frame.connection.setLocalApi({ ping: () => "pong" });
    const { host } = connectHost(token);
    await pending;
    await expect(host.remote["ping"]!()).resolves.toBe("pong");
  });

  it("rejects a frame call whose arguments cannot be cloned", async () => {
    const { frame, host } = boot();
    await host.setLocalApi({ take: () => "taken" });
    await frame.connection.remoteMethodsWaitPromise;
    await expect(
      frame.connection.remote["take"]!(() => {}),
    ).rejects.toMatchObject({ name: "DataCloneError" });
  });

  it("rejects a queued frame call that cannot be cloned at connect time", async () => {
    const { frame, token } = bootFrame();
    const call = (
      frame.connection as unknown as {
        callRemoteMethod(name: string, ...args: unknown[]): Promise<unknown>;
      }
    ).callRemoteMethod("take", () => {});
    connectHost(token);
    await expect(call).rejects.toMatchObject({ name: "DataCloneError" });
  });

  it("ignores malformed port messages", async () => {
    const { host, iframeInitialized } = boot();
    await vi.waitFor(() => expect(iframeInitialized).toHaveBeenCalled());
    const port = ports[0]!;
    port.postMessage(null);
    port.postMessage({ type: "response", callId: "unknown", success: true });
    port.postMessage({ type: "set-interface", callId: "x" });
    await expect(host.callRemoteServiceMethod("injectStyle", "")).resolves.toBe(
      undefined,
    );
  });

  it("runs code, injects styles and imports styles in <head>", async () => {
    const { host } = boot();
    await host.callRemoteServiceMethod("runCode", "window.ran = true;");
    await host.callRemoteServiceMethod("injectStyle", "body { color: red }");
    await host.callRemoteServiceMethod(
      "importStyle",
      "https://cdn.example/a.css",
    );

    const script = document.head.querySelector("script");
    expect(script?.textContent).toBe("window.ran = true;");
    expect(document.head.querySelector("style")?.textContent).toBe(
      "body { color: red }",
    );
    const link = document.head.querySelector("link");
    expect(link?.rel).toBe("stylesheet");
    expect(link?.href).toBe("https://cdn.example/a.css");
  });

  it("settles importScript on the script's load or error", async () => {
    const { host } = boot();
    const loaded = host.callRemoteServiceMethod(
      "importScript",
      "https://cdn.example/ok.js",
    );
    const failed = host.callRemoteServiceMethod(
      "importScript",
      "https://cdn.example/missing.js",
    );
    await vi.waitFor(() =>
      expect(document.head.querySelectorAll("script")).toHaveLength(2),
    );
    const [ok, missing] = document.head.querySelectorAll("script");
    expect(ok!.src).toBe("https://cdn.example/ok.js");
    ok!.dispatchEvent(new Event("load"));
    missing!.dispatchEvent(new Event("error"));
    await expect(loaded).resolves.toBeUndefined();
    await expect(failed).rejects.toThrow(
      "Websandbox: failed to load script https://cdn.example/missing.js",
    );
  });

  it("ignores a second connect", async () => {
    const { token, iframeInitialized } = boot();
    await vi.waitFor(() => expect(iframeInitialized).toHaveBeenCalled());
    const second = connectHost(token);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(second.iframeInitialized).not.toHaveBeenCalled();
  });
});
