// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultWebMcpAdapter,
  type WebMcpModelContext,
  type WebMcpToolDescriptor,
} from "./webmcp-adapter";

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

describe("getDefaultWebMcpAdapter", () => {
  it("reports unavailable when the page exposes no model context", () => {
    const adapter = getDefaultWebMcpAdapter();
    expect(adapter.available).toBe(false);
    expect(() => adapter.registerTool(descriptor)()).not.toThrow();
  });

  it("falls back to navigator.modelContext, preferring document when both exist", () => {
    const fromNavigator = vi.fn();
    install({ registerTool: fromNavigator }, "navigator");
    expect(getDefaultWebMcpAdapter().available).toBe(true);
    getDefaultWebMcpAdapter().registerTool(descriptor);
    expect(fromNavigator).toHaveBeenCalledOnce();

    const fromDocument = vi.fn();
    install({ registerTool: fromDocument });
    getDefaultWebMcpAdapter().registerTool(descriptor);
    expect(fromDocument).toHaveBeenCalledOnce();
    expect(fromNavigator).toHaveBeenCalledOnce();
  });

  it("registers with an abort signal and unregisters by name on dispose", () => {
    const unregisterTool = vi.fn();
    const registerTool = vi.fn();
    install({ registerTool, unregisterTool });

    const dispose = getDefaultWebMcpAdapter().registerTool(descriptor);
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

    getDefaultWebMcpAdapter().registerTool(descriptor)();
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
    const dispose = getDefaultWebMcpAdapter().registerTool(descriptor, onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);

    dispose();
    expect(unregisterTool).not.toHaveBeenCalled();
  });

  it("unregisters by name when the registration promise resolves", async () => {
    const unregisterTool = vi.fn();
    install({ registerTool: () => Promise.resolve(), unregisterTool });

    const dispose = getDefaultWebMcpAdapter().registerTool(descriptor);
    await Promise.resolve();
    dispose();
    expect(unregisterTool).toHaveBeenCalledWith("get_weather");
  });
});
