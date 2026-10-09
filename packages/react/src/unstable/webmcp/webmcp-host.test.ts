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

  it("registers with an abort signal and aborts it on dispose", () => {
    const registerTool = vi.fn();
    install({ registerTool });

    const dispose = getDefaultWebMcpHost().registerTool(descriptor);
    const options = registerTool.mock.calls[0]![1];
    expect(registerTool).toHaveBeenCalledWith(descriptor, expect.anything());
    expect(options.signal.aborted).toBe(false);

    dispose();
    expect(options.signal.aborted).toBe(true);
    expect(() => dispose()).not.toThrow();
  });

  it("reports a rejected registration to the caller", async () => {
    install({
      registerTool: () => Promise.reject(new Error("already registered")),
    });

    const onError = vi.fn();
    getDefaultWebMcpHost().registerTool(descriptor, onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it("aborts the signal even when the registration was rejected", async () => {
    let options: { signal?: AbortSignal } | undefined;
    install({
      registerTool: (_def, registerOptions) => {
        options = registerOptions;
        return Promise.reject(new Error("already registered"));
      },
    });

    const onError = vi.fn();
    const dispose = getDefaultWebMcpHost().registerTool(descriptor, onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());

    dispose();
    expect(options?.signal?.aborted).toBe(true);
  });

  it("lets a synchronous registration failure propagate", () => {
    install({
      registerTool: () => {
        throw new Error("already registered");
      },
    });

    expect(() => getDefaultWebMcpHost().registerTool(descriptor)).toThrow(
      "already registered",
    );
  });

  it("survives a registration that returns a bare thenable", () => {
    install({
      registerTool: () =>
        ({
          then: (resolve: () => void) => resolve(),
        }) as unknown as Promise<void>,
    });

    const dispose = getDefaultWebMcpHost().registerTool(descriptor);
    expect(() => dispose()).not.toThrow();
  });

  it("survives a registration that returns nothing", () => {
    const registerTool = vi.fn();
    install({ registerTool });

    const dispose = getDefaultWebMcpHost().registerTool(descriptor);
    dispose();
    expect(registerTool.mock.calls[0]![1].signal.aborted).toBe(true);
  });
});
