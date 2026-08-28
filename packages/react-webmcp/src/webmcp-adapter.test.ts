// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultWebMcpAdapter,
  type WebMcpModelContext,
  type WebMcpToolDescriptor,
} from "./webmcp-adapter";

const descriptor: WebMcpToolDescriptor = {
  name: "t",
  description: "",
  inputSchema: {},
  execute: async () => ({ content: [] }),
};

const setModelContext = (context: WebMcpModelContext) => {
  (document as { modelContext?: WebMcpModelContext }).modelContext = context;
};

afterEach(() => {
  delete (document as { modelContext?: unknown }).modelContext;
  delete (navigator as { modelContext?: unknown }).modelContext;
});

describe("getDefaultWebMcpAdapter", () => {
  it("is unavailable when no model context global exists", () => {
    expect(getDefaultWebMcpAdapter().available).toBe(false);
  });

  it("passes an abort signal to a promise-based registerTool and aborts it on dispose", () => {
    let seenSignal: AbortSignal | undefined;
    setModelContext({
      registerTool: (_tool, options) => {
        seenSignal = options?.signal;
        return Promise.resolve();
      },
    });

    const adapter = getDefaultWebMcpAdapter();
    const dispose = adapter.registerTool(descriptor);

    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect(seenSignal!.aborted).toBe(false);
    dispose();
    expect(seenSignal!.aborted).toBe(true);
  });

  it("reports a rejected promise-based registration through onError", async () => {
    setModelContext({
      registerTool: () => Promise.reject(new Error("taken")),
    });

    const adapter = getDefaultWebMcpAdapter();
    const onError = vi.fn();
    adapter.registerTool(descriptor, onError);

    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "taken" }),
      ),
    );
  });

  it("disposes a handle-based registration via unregister exactly once", () => {
    const unregister = vi.fn();
    setModelContext({ registerTool: () => ({ unregister }) });

    const dispose = getDefaultWebMcpAdapter().registerTool(descriptor);
    dispose();
    dispose();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it("falls back to unregisterTool when registerTool returns nothing", () => {
    const unregisterTool = vi.fn();
    setModelContext({ registerTool: () => {}, unregisterTool });

    const dispose = getDefaultWebMcpAdapter().registerTool(descriptor);
    dispose();
    expect(unregisterTool).toHaveBeenCalledWith("t");
  });

  it("exposes hasTool over a synchronous getTools", () => {
    setModelContext({
      registerTool: () => {},
      getTools: () => [{ name: "existing" }],
    });

    const adapter = getDefaultWebMcpAdapter();
    expect(adapter.hasTool?.("existing")).toBe(true);
    expect(adapter.hasTool?.("missing")).toBe(false);
  });

  it("unregisters a promise-based registration by name on dispose", () => {
    const unregisterTool = vi.fn();
    setModelContext({
      registerTool: () => Promise.resolve(),
      unregisterTool,
    });

    const dispose = getDefaultWebMcpAdapter().registerTool(descriptor);
    dispose();
    dispose();

    expect(unregisterTool).toHaveBeenCalledTimes(1);
    expect(unregisterTool).toHaveBeenCalledWith("t");
  });

  it("does not report its own registration as a collision after an async removal", () => {
    const registry = new Map<string, WebMcpToolDescriptor>();
    setModelContext({
      registerTool: (tool) => {
        registry.set(tool.name, tool);
        return Promise.resolve();
      },
      unregisterTool: (name) => {
        queueMicrotask(() => registry.delete(name));
      },
      getTools: () => [...registry.values()].map(({ name }) => ({ name })),
    });

    const adapter = getDefaultWebMcpAdapter();
    expect(adapter.hasTool?.("t")).toBe(false);

    const dispose = adapter.registerTool(descriptor);
    dispose();

    expect(registry.has("t")).toBe(true);
    expect(adapter.hasTool?.("t")).toBe(false);
  });

  it("reuses one adapter per model context so a remount keeps its ownership", () => {
    const context: WebMcpModelContext = {
      registerTool: () => Promise.resolve(),
      getTools: () => [{ name: "t" }],
    };
    setModelContext(context);

    const first = getDefaultWebMcpAdapter();
    first.registerTool(descriptor)();

    expect(getDefaultWebMcpAdapter()).toBe(first);
    expect(getDefaultWebMcpAdapter().hasTool?.("t")).toBe(false);
  });

  it("treats an asynchronous getTools as unenumerable", () => {
    setModelContext({
      registerTool: () => {},
      getTools: () => Promise.resolve([{ name: "existing" }]),
    });

    expect(getDefaultWebMcpAdapter().hasTool?.("existing")).toBe(false);
  });
});
