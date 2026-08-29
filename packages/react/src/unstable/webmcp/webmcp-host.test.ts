// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultWebMcpHost,
  type WebMcpModelContext,
  type WebMcpToolDescriptor,
} from "./webmcp-host";

type Host = { modelContext?: WebMcpModelContext };

const descriptor: WebMcpToolDescriptor = {
  name: "get_weather",
  description: "",
  inputSchema: {},
  execute: async () => ({ content: [] }),
};

const install = (
  context: Partial<WebMcpModelContext>,
  on: "document" | "navigator" = "document",
) => {
  const host = (on === "document" ? document : navigator) as Host;
  host.modelContext = context as WebMcpModelContext;
  return context;
};

afterEach(() => {
  delete (document as Host).modelContext;
  delete (navigator as Host).modelContext;
});

describe("getDefaultWebMcpHost", () => {
  it("reports unavailable when the page exposes no model context", () => {
    const host = getDefaultWebMcpHost();
    expect(host.available).toBe(false);
    expect(() => host.registerTool(descriptor)()).not.toThrow();
  });

  it("reports unavailable and warns when the platform property has no registerTool", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      install({} as Partial<WebMcpModelContext>);
      const host = getDefaultWebMcpHost();
      expect(host.available).toBe(false);
      expect(() => host.registerTool(descriptor)()).not.toThrow();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("no callable registerTool"),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("falls back to navigator.modelContext, preferring document when both exist", () => {
    const fromNavigator = vi.fn();
    install({ registerTool: fromNavigator }, "navigator");
    expect(getDefaultWebMcpHost().available).toBe(true);
    getDefaultWebMcpHost().registerTool(descriptor);
    expect(fromNavigator).toHaveBeenCalledOnce();

    const fromDocument = vi.fn();
    install({ registerTool: fromDocument });
    getDefaultWebMcpHost().registerTool(descriptor);
    expect(fromDocument).toHaveBeenCalledOnce();
    expect(fromNavigator).toHaveBeenCalledOnce();
  });

  it("registers with an abort signal and unregisters by name on dispose", () => {
    const unregisterTool = vi.fn();
    const registerTool = vi.fn();
    install({ registerTool, unregisterTool });

    const dispose = getDefaultWebMcpHost().registerTool(descriptor);
    const options = registerTool.mock.calls[0]![1];
    expect(registerTool).toHaveBeenCalledWith(descriptor, expect.anything());
    expect(options.signal.aborted).toBe(false);

    dispose();
    expect(options.signal.aborted).toBe(true);
    expect(unregisterTool).toHaveBeenCalledWith("get_weather");

    dispose();
    expect(unregisterTool).toHaveBeenCalledOnce();
  });

  it("prefers the unregister handle a synchronous registration returns", () => {
    const unregister = vi.fn();
    const unregisterTool = vi.fn();
    install({ registerTool: () => ({ unregister }), unregisterTool });

    getDefaultWebMcpHost().registerTool(descriptor)();
    expect(unregister).toHaveBeenCalledOnce();
    expect(unregisterTool).not.toHaveBeenCalled();
  });

  it("reports a rejected registration and leaves the page's tool alone", async () => {
    const unregisterTool = vi.fn();
    install({
      registerTool: () => Promise.reject(new Error("already registered")),
      unregisterTool,
    });

    const onError = vi.fn();
    const dispose = getDefaultWebMcpHost().registerTool(descriptor, onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);

    dispose();
    expect(unregisterTool).not.toHaveBeenCalled();
  });

  it("defers cleanup when disposed while the registration is still pending", async () => {
    const unregisterTool = vi.fn();
    let settle!: (value?: unknown) => void;
    let fail!: (error: unknown) => void;
    install({
      registerTool: () =>
        new Promise<void>((resolve, reject) => {
          settle = resolve as (value?: unknown) => void;
          fail = reject;
        }),
      unregisterTool,
    });

    const onError = vi.fn();
    getDefaultWebMcpHost().registerTool(descriptor, onError)();
    expect(unregisterTool).not.toHaveBeenCalled();

    fail(new Error("already registered"));
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(unregisterTool).not.toHaveBeenCalled();

    getDefaultWebMcpHost().registerTool(descriptor)();
    settle();
    await vi.waitFor(() =>
      expect(unregisterTool).toHaveBeenCalledWith("get_weather"),
    );
    expect(unregisterTool).toHaveBeenCalledOnce();
  });

  it("warns instead of rejecting when a deferred unregister throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      let settle!: () => void;
      install({
        registerTool: () =>
          new Promise<void>((resolve) => {
            settle = resolve;
          }),
        unregisterTool: () => {
          throw new Error("unregister boom");
        },
      });

      getDefaultWebMcpHost().registerTool(descriptor)();
      settle();

      await vi.waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('Unregistering WebMCP tool "get_weather"'),
          expect.any(Error),
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("does not unregister a name a later registration has taken over", async () => {
    const settles: Array<() => void> = [];
    const unregisterTool = vi.fn();
    install({
      registerTool: () =>
        new Promise<void>((resolve) => {
          settles.push(resolve);
        }),
      unregisterTool,
    });

    const disposeFirst = getDefaultWebMcpHost().registerTool(descriptor);
    disposeFirst();

    getDefaultWebMcpHost().registerTool(descriptor);
    expect(settles).toHaveLength(2);

    settles[1]!();
    settles[0]!();
    await vi.waitFor(() => expect(settles).toHaveLength(2));
    await Promise.resolve();

    expect(unregisterTool).not.toHaveBeenCalled();
  });

  it("still releases the name when the registration that displaced it is refused", async () => {
    const settles: Array<() => void> = [];
    const fails: Array<(error: Error) => void> = [];
    const unregisterTool = vi.fn();
    install({
      registerTool: () =>
        new Promise<void>((resolve, reject) => {
          settles.push(resolve);
          fails.push(reject);
        }),
      unregisterTool,
    });

    const disposeFirst = getDefaultWebMcpHost().registerTool(descriptor);
    disposeFirst();

    const onError = vi.fn();
    getDefaultWebMcpHost().registerTool(descriptor, onError);
    fails[1]!(new Error("already registered"));
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());

    settles[0]!();
    await vi.waitFor(() =>
      expect(unregisterTool).toHaveBeenCalledWith("get_weather"),
    );
  });

  it("still releases the name when the registration that displaced it throws", async () => {
    let settle!: () => void;
    let throwOnRegister = false;
    const unregisterTool = vi.fn();
    install({
      registerTool: () => {
        if (throwOnRegister) throw new Error("already registered");
        return new Promise<void>((resolve) => {
          settle = resolve;
        });
      },
      unregisterTool,
    });

    const disposeFirst = getDefaultWebMcpHost().registerTool(descriptor);
    disposeFirst();

    throwOnRegister = true;
    expect(() => getDefaultWebMcpHost().registerTool(descriptor)).toThrow(
      "already registered",
    );

    settle();
    await vi.waitFor(() =>
      expect(unregisterTool).toHaveBeenCalledWith("get_weather"),
    );
  });

  it("survives a registration handle that settles synchronously", () => {
    const unregisterTool = vi.fn();
    install({
      registerTool: () =>
        ({
          then: (resolve: () => void) => resolve(),
        }) as unknown as Promise<void>,
      unregisterTool,
    });

    const dispose = getDefaultWebMcpHost().registerTool(descriptor);
    expect(unregisterTool).not.toHaveBeenCalled();

    dispose();
    expect(unregisterTool).toHaveBeenCalledWith("get_weather");
  });

  it("unregisters by name when the registration promise resolves", async () => {
    const unregisterTool = vi.fn();
    install({ registerTool: () => Promise.resolve(), unregisterTool });

    const dispose = getDefaultWebMcpHost().registerTool(descriptor);
    await Promise.resolve();
    dispose();
    expect(unregisterTool).toHaveBeenCalledWith("get_weather");
  });
});
