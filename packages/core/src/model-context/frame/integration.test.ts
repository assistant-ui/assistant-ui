/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AssistantFrameProvider } from "./provider";
import { AssistantFrameHost } from "./host";
import { ModelContextRegistry } from "../registry";
import z from "zod";

describe("AssistantFrame Integration", () => {
  let iframeWindow: Window;
  let parentDescriptor: PropertyDescriptor;
  let deliveries: Promise<void>[];
  let hosts: AssistantFrameHost[];

  const flushMessages = async () => {
    while (deliveries.length > 0) {
      await Promise.all(deliveries.splice(0));
    }
  };

  const createHost = () => {
    const host = new AssistantFrameHost(iframeWindow);
    hosts.push(host);
    return host;
  };

  beforeEach(() => {
    deliveries = [];
    hosts = [];
    parentDescriptor = Object.getOwnPropertyDescriptor(window, "parent")!;

    const deliver = (data: unknown, source: Window) => {
      deliveries.push(
        Promise.resolve().then(() => {
          window.dispatchEvent(
            new MessageEvent("message", {
              data,
              source,
              origin: window.location.origin,
            }),
          );
        }),
      );
    };
    const parentWindow = {
      postMessage: (data: unknown) => deliver(data, iframeWindow),
    } as Window;
    iframeWindow = {
      postMessage: (data: unknown) => deliver(data, parentWindow),
    } as Window;

    Object.defineProperty(window, "parent", {
      value: parentWindow,
      configurable: true,
    });
  });

  afterEach(async () => {
    try {
      for (const host of hosts) host.dispose();
      AssistantFrameProvider.dispose();
      await flushMessages();
    } finally {
      Object.defineProperty(window, "parent", parentDescriptor);
      vi.restoreAllMocks();
    }
  });

  it("connects regardless of whether the host or provider starts first", async () => {
    const host = createHost();
    await flushMessages();
    expect(host.getModelContext()).toEqual({});

    const registry = new ModelContextRegistry();
    registry.addInstruction("Provider is ready.");
    AssistantFrameProvider.addModelContextProvider(registry);
    await flushMessages();

    expect(host.getModelContext().system).toBe("Provider is ready.");

    const lateHost = createHost();
    await flushMessages();
    expect(lateHost.getModelContext().system).toBe("Provider is ready.");
  });

  it("should sync tools from provider to host", async () => {
    const registry = new ModelContextRegistry();

    const toolExecute = vi.fn().mockResolvedValue({ result: "search results" });
    registry.addTool({
      toolName: "search",
      description: "Search the web",
      parameters: z.object({ query: z.string() }),
      execute: toolExecute,
    });

    const unsubscribe =
      AssistantFrameProvider.addModelContextProvider(registry);

    const host = createHost();

    await flushMessages();
    const context = host.getModelContext();
    expect(context.tools).toBeDefined();
    expect(context.tools?.search).toBeDefined();
    expect(context.tools?.search?.description).toBe("Search the web");

    host.dispose();
    unsubscribe();
  });

  it("should execute tools through the frame boundary", async () => {
    const registry = new ModelContextRegistry();

    const toolExecute = vi
      .fn()
      .mockResolvedValue({ results: ["result1", "result2"] });
    registry.addTool({
      toolName: "search",
      description: "Search the web",
      parameters: z.object({ query: z.string() }),
      execute: toolExecute,
    });

    const unsubscribe =
      AssistantFrameProvider.addModelContextProvider(registry);

    const host = createHost();

    await flushMessages();
    const context = host.getModelContext();
    expect(context.tools?.search).toBeDefined();

    const searchTool = context.tools?.search;

    const resultPromise = searchTool!.execute!(
      { query: "test query" },
      {} as any,
    );

    const result = await resultPromise;
    expect(toolExecute).toHaveBeenCalledWith(
      { query: "test query" },
      expect.objectContaining({
        toolCallId: expect.any(String),
        abortSignal: expect.any(AbortSignal),
      }),
    );

    expect(result).toEqual({ results: ["result1", "result2"] });

    host.dispose();
    unsubscribe();
  });

  it("should handle tool execution errors", async () => {
    const registry = new ModelContextRegistry();

    const toolExecute = vi
      .fn()
      .mockRejectedValue(new Error("Tool execution failed"));
    registry.addTool({
      toolName: "failingTool",
      description: "A tool that fails",
      parameters: z.object({ input: z.string() }),
      execute: toolExecute,
    });

    const unsubscribe =
      AssistantFrameProvider.addModelContextProvider(registry);

    const host = createHost();

    await flushMessages();
    const context = host.getModelContext();
    expect(context.tools?.failingTool).toBeDefined();

    const failingTool = context.tools?.failingTool;

    await expect(
      failingTool!.execute!({ input: "test" }, {} as any),
    ).rejects.toThrow("Tool execution failed");

    host.dispose();
    unsubscribe();
  });

  it("rejects a tool call the frame drops while it is disposed", async () => {
    const registry = new ModelContextRegistry();
    const toolExecute = vi.fn().mockResolvedValue("result");
    registry.addTool({
      toolName: "search",
      parameters: z.object({}),
      execute: toolExecute,
    });
    AssistantFrameProvider.addModelContextProvider(registry);
    const host = createHost();
    await flushMessages();
    expect(host.getModelContext().tools?.search).toBeDefined();

    const result = host.getModelContext().tools!.search!.execute!(
      {},
      {} as any,
    );
    AssistantFrameProvider.dispose();

    await expect(result).rejects.toThrow(
      "AssistantFrameProvider has been disposed",
    );
    expect(toolExecute).not.toHaveBeenCalled();
    expect(host.getModelContext().tools).toBeUndefined();

    host.dispose();
  });

  it("should handle multiple providers", async () => {
    const registry1 = new ModelContextRegistry();
    const registry2 = new ModelContextRegistry();

    registry1.addTool({
      toolName: "tool1",
      description: "First tool",
      parameters: z.object({ input: z.string() }),
      execute: async () => ({ from: "tool1" }),
    });

    registry2.addTool({
      toolName: "tool2",
      description: "Second tool",
      parameters: z.object({ input: z.string() }),
      execute: async () => ({ from: "tool2" }),
    });

    const unsub1 = AssistantFrameProvider.addModelContextProvider(registry1);
    const unsub2 = AssistantFrameProvider.addModelContextProvider(registry2);

    const host = createHost();

    await flushMessages();
    const context = host.getModelContext();
    expect(context.tools?.tool1).toBeDefined();
    expect(context.tools?.tool2).toBeDefined();

    host.dispose();
    unsub1();
    unsub2();
  });

  it("should merge system instructions from multiple providers", async () => {
    const registry1 = new ModelContextRegistry();
    const registry2 = new ModelContextRegistry();

    registry1.addInstruction("You are a helpful assistant.");
    registry2.addInstruction("Always be concise.");

    const unsub1 = AssistantFrameProvider.addModelContextProvider(registry1);
    const unsub2 = AssistantFrameProvider.addModelContextProvider(registry2);

    const host = createHost();

    await flushMessages();
    const context = host.getModelContext();
    expect(context.system).toBeDefined();
    expect(context.system).toContain("You are a helpful assistant.");
    expect(context.system).toContain("Always be concise.");

    host.dispose();
    unsub1();
    unsub2();
  });

  it("should act as empty ModelContextProvider when iframe has no providers", async () => {
    const host = createHost();

    const context = host.getModelContext();
    expect(context).toEqual({});

    await flushMessages();

    expect(host.getModelContext()).toEqual({});

    host.dispose();
  });

  it("stops receiving context updates after host disposal", async () => {
    const registry = new ModelContextRegistry();
    const instruction = registry.addInstruction("Initial instructions.");
    AssistantFrameProvider.addModelContextProvider(registry);
    const host = createHost();
    await flushMessages();
    expect(host.getModelContext().system).toBe("Initial instructions.");

    host.dispose();
    const nextHost = createHost();
    instruction.update("Updated instructions.");
    await flushMessages();

    expect(nextHost.getModelContext().system).toBe("Updated instructions.");
    expect(host.getModelContext().system).toBe("Initial instructions.");
  });
});
