import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Tool } from "assistant-stream";
import {
  anthropicToolSearchAdapter,
  openaiToolSearchAdapter,
} from "assistant-stream";

// Minimal stub for DefaultChatTransport so we don't need the full AI SDK in tests
vi.mock("ai", () => {
  class DefaultChatTransport {
    protected options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  return { DefaultChatTransport };
});

import { AssistantChatTransport } from "../AssistantChatTransport";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

function makeRuntime(
  tools: Record<string, Tool<any, any>> | undefined,
  deferredTools: Record<string, Tool<any, any>> | undefined,
) {
  return {
    thread: {
      getModelContext: () => ({
        tools,
        deferredTools,
        system: undefined,
        callSettings: undefined,
        config: undefined,
      }),
    },
    threads: {
      mainItem: {
        initialize: async () => undefined,
      },
    },
  } as any;
}

describe("AssistantChatTransport — prepareSendMessagesRequest", () => {
  let transport: AssistantChatTransport<any>;
  let capturedOptions: any;

  beforeEach(() => {
    capturedOptions = undefined;
    transport = new AssistantChatTransport({
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });
  });

  async function callPrepare(
    runtime: any,
    extraOptions: Record<string, any> = {},
  ) {
    transport.setRuntime(runtime);
    // Access the internal options passed to DefaultChatTransport
    const internalOptions = (transport as any).options;
    return internalOptions.prepareSendMessagesRequest({
      id: "thread-1",
      messages: [],
      trigger: "submit",
      messageId: "msg-1",
      requestMetadata: {},
      ...extraOptions,
    });
  }

  it("sends core tools in body without deferred fields when no deferredTools", async () => {
    const runtime = makeRuntime({ coreTool: stubTool() }, undefined);
    await callPrepare(runtime);

    expect(capturedOptions.body.tools).toHaveProperty("coreTool");
    expect(capturedOptions.body.include_tool_search_tool).toBeUndefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
  });

  it("emits providerOptions.anthropic.deferLoading: true on each deferred tool", async () => {
    const runtime = makeRuntime(undefined, { deferredTool: stubTool() });
    await callPrepare(runtime);

    expect(
      (capturedOptions.body.tools.deferredTool as any).providerOptions
        ?.anthropic?.deferLoading,
    ).toBe(true);
  });

  it("does not emit the old defer_loading top-level flag", async () => {
    const runtime = makeRuntime(undefined, { deferredTool: stubTool() });
    await callPrepare(runtime);

    expect(
      (capturedOptions.body.tools.deferredTool as any).defer_loading,
    ).toBeUndefined();
  });

  it("injects tool_search_tool_bm25 entry when deferred tools present", async () => {
    const runtime = makeRuntime(undefined, { deferredTool: stubTool() });
    await callPrepare(runtime);

    const entry = capturedOptions.body.tools.tool_search_tool_bm25;
    expect(entry).toBeDefined();
    expect(entry.type).toBe("tool_search_tool_bm25_20251119");
    expect(entry.name).toBe("tool_search_tool_bm25");
  });

  it("does not include include_tool_search_tool body flag", async () => {
    const runtime = makeRuntime(undefined, { deferredTool: stubTool() });
    await callPrepare(runtime);

    expect(capturedOptions.body.include_tool_search_tool).toBeUndefined();
  });

  it("adds anthropic-beta header when deferred tools present", async () => {
    const runtime = makeRuntime(undefined, { deferredTool: stubTool() });
    await callPrepare(runtime);

    expect(capturedOptions.headers?.["anthropic-beta"]).toBe(
      "advanced-tool-use-2025-11-20",
    );
  });

  it("merges core and deferred tools in request body", async () => {
    const runtime = makeRuntime(
      { coreTool: stubTool() },
      { deferredTool: stubTool() },
    );
    await callPrepare(runtime);

    expect(capturedOptions.body.tools).toHaveProperty("coreTool");
    expect(capturedOptions.body.tools).toHaveProperty("deferredTool");
    expect(
      (capturedOptions.body.tools.deferredTool as any).providerOptions
        ?.anthropic?.deferLoading,
    ).toBe(true);
    expect(
      (capturedOptions.body.tools.coreTool as any).providerOptions,
    ).toBeUndefined();
  });

  it("does not add tool_search_tool entry or anthropic-beta when no deferred tools", async () => {
    const runtime = makeRuntime({ coreTool: stubTool() }, undefined);
    await callPrepare(runtime);

    expect(capturedOptions.body.include_tool_search_tool).toBeUndefined();
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
    const headers = capturedOptions.headers;
    expect(headers?.["anthropic-beta"]).toBeUndefined();
  });

  it("preserves existing headers alongside anthropic-beta", async () => {
    const runtime = makeRuntime(undefined, { deferredTool: stubTool() });
    await callPrepare(runtime, {
      headers: { "x-custom": "value" },
    });

    expect(capturedOptions.headers?.["anthropic-beta"]).toBe(
      "advanced-tool-use-2025-11-20",
    );
    expect(capturedOptions.headers?.["x-custom"]).toBe("value");
  });

  it("sorts tool names alphabetically in the request body", async () => {
    const runtime = makeRuntime(
      {
        zebra_tool: stubTool(),
        apple_tool: stubTool(),
      },
      {
        mango_deferred: stubTool(),
        banana_deferred: stubTool(),
      },
    );
    await callPrepare(runtime);

    const keys = Object.keys(capturedOptions.body.tools);
    // tool_search_tool_bm25 will be appended after sorting, but core+deferred tools
    // should be in alphabetical order before the search entry
    const toolKeys = keys.filter((k) => !k.startsWith("tool_search_tool_"));
    expect(toolKeys).toEqual([...toolKeys].sort());
  });

  it("injects tool_search_tool_regex entry when toolSearchVariant is regex", async () => {
    capturedOptions = undefined;
    const regexTransport = new AssistantChatTransport({
      toolSearchVariant: "regex",
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });
    regexTransport.setRuntime(
      makeRuntime(undefined, { deferredTool: stubTool() }),
    );
    const internalOptions = (regexTransport as any).options;
    await internalOptions.prepareSendMessagesRequest({
      id: "thread-1",
      messages: [],
      trigger: "submit",
      messageId: "msg-1",
      requestMetadata: {},
    });

    const entry = capturedOptions.body.tools.tool_search_tool_regex;
    expect(entry).toBeDefined();
    expect(entry.type).toBe("tool_search_tool_regex_20251119");
    expect(entry.name).toBe("tool_search_tool_regex");
    // bm25 entry should not be present
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
  });
});

describe("AssistantChatTransport — toolWireFormat option (Phase 2)", () => {
  async function callPrepareWithTransport(
    transport: AssistantChatTransport<any>,
    runtime: any,
    extraOptions: Record<string, any> = {},
  ) {
    transport.setRuntime(runtime);
    const internalOptions = (transport as any).options;
    return internalOptions.prepareSendMessagesRequest({
      id: "thread-1",
      messages: [],
      trigger: "submit",
      messageId: "msg-1",
      requestMetadata: {},
      ...extraOptions,
    });
  }

  function makeRuntime(
    tools: Record<string, Tool<any, any>> | undefined,
    deferredTools: Record<string, Tool<any, any>> | undefined,
  ) {
    return {
      thread: {
        getModelContext: () => ({
          tools,
          deferredTools,
          system: undefined,
          callSettings: undefined,
          config: undefined,
        }),
      },
      threads: {
        mainItem: {
          initialize: async () => undefined,
        },
      },
    } as any;
  }

  it('toolWireFormat: "anthropic" (default) — same behavior as Phase 1', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      toolWireFormat: "anthropic",
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntime(undefined, { deferredTool: stubTool() }),
    );

    expect(
      (capturedOptions.body.tools.deferredTool as any).providerOptions
        ?.anthropic?.deferLoading,
    ).toBe(true);
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeDefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBe(
      "advanced-tool-use-2025-11-20",
    );
  });

  it("toolWireFormat: custom anthropicToolSearchAdapter instance with regex variant", async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      toolWireFormat: anthropicToolSearchAdapter({ variant: "regex" }),
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntime(undefined, { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search_tool_regex).toBeDefined();
    expect(capturedOptions.body.tools.tool_search_tool_regex.type).toBe(
      "tool_search_tool_regex_20251119",
    );
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
  });

  it('toolWireFormat: "openai" — injects tool_search entry and stamps openai.deferLoading', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      toolWireFormat: "openai",
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntime(undefined, { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search).toBeDefined();
    expect((capturedOptions.body.tools.tool_search as any).type).toBe(
      "tool_search",
    );
    expect(
      (capturedOptions.body.tools.deferredTool as any).providerOptions?.openai
        ?.deferLoading,
    ).toBe(true);
    // No Anthropic-specific fields
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
  });

  it("toolWireFormat: custom openaiToolSearchAdapter instance", async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      toolWireFormat: openaiToolSearchAdapter({ mode: "client" }),
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntime(undefined, { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search).toBeDefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
  });

  it('toolWireFormat: "generic" uses discovery-wrapper fallback', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      toolWireFormat: "generic",
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntime({ coreTool: stubTool() }, { deferredTool: stubTool() }),
    );

    // Generic adapter keeps eager tools and injects the two stable wrapper
    // tools; deferred tools stay OFF the wire (cache-safe fallback).
    expect(capturedOptions.body.tools).toHaveProperty("coreTool");
    expect(capturedOptions.body.tools).toHaveProperty("aui_discover_tools");
    expect(capturedOptions.body.tools).toHaveProperty("aui_run_dynamic_tool");
    expect(capturedOptions.body.tools).not.toHaveProperty("deferredTool");
    // No Anthropic-specific headers or search entry
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
  });
});

describe("AssistantChatTransport — provider auto-detection (Phase 3)", () => {
  function makeRuntimeWithModel(
    modelName: string | undefined,
    deferredTools: Record<string, Tool<any, any>> | undefined,
  ) {
    return {
      thread: {
        getModelContext: () => ({
          tools: undefined,
          deferredTools,
          system: undefined,
          callSettings: undefined,
          config: modelName ? { modelName } : undefined,
        }),
      },
      threads: {
        mainItem: {
          initialize: async () => undefined,
        },
      },
    } as any;
  }

  async function callPrepareWithTransport(
    transport: AssistantChatTransport<any>,
    runtime: any,
  ) {
    transport.setRuntime(runtime);
    const internalOptions = (transport as any).options;
    return internalOptions.prepareSendMessagesRequest({
      id: "thread-1",
      messages: [],
      trigger: "submit",
      messageId: "msg-1",
      requestMetadata: {},
    });
  }

  it('modelName "gpt-5.4" auto-detects OpenAI adapter', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntimeWithModel("gpt-5.4", { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search).toBeDefined();
    expect(
      (capturedOptions.body.tools.deferredTool as any).providerOptions?.openai
        ?.deferLoading,
    ).toBe(true);
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
  });

  it('modelName "claude-sonnet-4-5" auto-detects Anthropic adapter', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntimeWithModel("claude-sonnet-4-5", { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeDefined();
    expect(
      (capturedOptions.body.tools.deferredTool as any).providerOptions
        ?.anthropic?.deferLoading,
    ).toBe(true);
    expect(capturedOptions.headers?.["anthropic-beta"]).toBe(
      "advanced-tool-use-2025-11-20",
    );
    expect(capturedOptions.body.tools.tool_search).toBeUndefined();
  });

  it("missing modelName defaults to Anthropic adapter", async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntimeWithModel(undefined, { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeDefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBe(
      "advanced-tool-use-2025-11-20",
    );
    expect(capturedOptions.body.tools.tool_search).toBeUndefined();
  });

  it('explicit toolWireFormat: "openai" overrides modelName "claude-sonnet-4-5"', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      toolWireFormat: "openai",
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntimeWithModel("claude-sonnet-4-5", { deferredTool: stubTool() }),
    );

    // Explicit "openai" override wins even though modelName suggests Anthropic
    expect(capturedOptions.body.tools.tool_search).toBeDefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
  });

  it('modelName starting with "o1" auto-detects OpenAI adapter', async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntimeWithModel("o1-preview", { deferredTool: stubTool() }),
    );

    expect(capturedOptions.body.tools.tool_search).toBeDefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
  });

  it("unrecognized modelName falls back to the generic discovery wrappers", async () => {
    let capturedOptions: any;
    const transport = new AssistantChatTransport({
      prepareSendMessagesRequest: (async (opts: any) => {
        capturedOptions = opts;
        return undefined;
      }) as any,
    });

    await callPrepareWithTransport(
      transport,
      makeRuntimeWithModel("gemini-2.0-flash", { deferredTool: stubTool() }),
    );

    // No provider-specific wire fields leak to an unknown provider.
    expect(capturedOptions.body.tools).toHaveProperty("aui_discover_tools");
    expect(capturedOptions.body.tools).toHaveProperty("aui_run_dynamic_tool");
    expect(capturedOptions.body.tools).not.toHaveProperty("deferredTool");
    expect(capturedOptions.body.tools.tool_search).toBeUndefined();
    expect(capturedOptions.body.tools.tool_search_tool_bm25).toBeUndefined();
    expect(capturedOptions.headers?.["anthropic-beta"]).toBeUndefined();
  });
});
