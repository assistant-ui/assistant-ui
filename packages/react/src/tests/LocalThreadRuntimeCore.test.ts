import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalThreadRuntimeCore } from "../legacy-runtime/runtime-cores/local/LocalThreadRuntimeCore";
import type { ChatModelAdapter } from "../legacy-runtime/runtime-cores/local/ChatModelAdapter";
import type { LocalRuntimeOptionsBase } from "../legacy-runtime/runtime-cores/local/LocalRuntimeOptions";
import type { ModelContextProvider } from "../model-context/ModelContextTypes";
import type { AppendMessage } from "@assistant-ui/core";

const createMockContextProvider = (): ModelContextProvider => ({
  getModelContext: () => ({}),
});

const createOptions = (
  adapter: ChatModelAdapter,
  overrides: Partial<LocalRuntimeOptionsBase> = {},
): LocalRuntimeOptionsBase => ({
  adapters: { chatModel: adapter },
  ...overrides,
});

const createUserAppendMessage = (
  text: string,
  overrides: Partial<AppendMessage> = {},
): AppendMessage => ({
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  parentId: null,
  sourceId: null,
  runConfig: undefined,
  createdAt: new Date(),
  ...overrides,
});

describe("LocalThreadRuntimeCore", () => {
  let contextProvider: ModelContextProvider;

  beforeEach(() => {
    contextProvider = createMockContextProvider();
  });

  it("appends a user message and runs the chat model", async () => {
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Hello!" }],
        status: { type: "complete", reason: "stop" },
      }),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter),
    );

    await core.append(createUserAppendMessage("Hi"));

    const messages = core.messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");
    expect(messages[1]!.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text", text: "Hello!" }),
      ]),
    );
    expect(messages[1]!.status).toEqual({ type: "complete", reason: "stop" });
    expect(adapter.run).toHaveBeenCalledOnce();
  });

  it("streams assistant response via async generator", async () => {
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: [{ type: "text" as const, text: "Hel" }],
        };
        yield {
          content: [{ type: "text" as const, text: "Hello world" }],
          status: { type: "complete" as const, reason: "stop" as const },
        };
      }),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter),
    );

    await core.append(createUserAppendMessage("Stream test"));

    const messages = core.messages;
    expect(messages).toHaveLength(2);
    const assistant = messages[1]!;
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text", text: "Hello world" }),
      ]),
    );
    expect(assistant.status).toEqual({ type: "complete", reason: "stop" });
  });

  it("cancels a running response", async () => {
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockImplementation(async function* ({ abortSignal }) {
        yield {
          content: [{ type: "text" as const, text: "partial" }],
        };
        // Wait until the abort signal fires
        await new Promise<void>((_resolve, reject) => {
          if (abortSignal.aborted) {
            reject(abortSignal.reason);
            return;
          }
          abortSignal.addEventListener(
            "abort",
            () => reject(abortSignal.reason),
            { once: true },
          );
        });
      }),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter),
    );

    // Start append but don't await (it will hang until cancelled)
    const appendPromise = core.append(createUserAppendMessage("Cancel me"));

    // Give the generator time to yield first chunk
    await new Promise((r) => setTimeout(r, 50));

    core.cancelRun();
    await appendPromise;

    const messages = core.messages;
    expect(messages).toHaveLength(2);
    const assistant = messages[1]!;
    expect(assistant.status).toBeDefined();
    expect(assistant.status!.type).toBe("incomplete");
    if (assistant.status!.type === "incomplete") {
      expect(assistant.status!.reason).toBe("cancelled");
    }
  });

  it("handles adapter errors gracefully", async () => {
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockRejectedValue(new Error("Model unavailable")),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter),
    );

    await expect(
      core.append(createUserAppendMessage("Error test")),
    ).rejects.toThrow("Model unavailable");

    const messages = core.messages;
    expect(messages).toHaveLength(2);
    const assistant = messages[1]!;
    expect(assistant.status).toBeDefined();
    expect(assistant.status!.type).toBe("incomplete");
    if (assistant.status!.type === "incomplete") {
      expect(assistant.status!.reason).toBe("error");
      expect(assistant.status!.error).toBe("Model unavailable");
    }
  });

  it("continues tool execution loop", async () => {
    let callCount = 0;
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            content: [
              {
                type: "tool-call",
                toolCallId: "tc1",
                toolName: "myTool",
                args: { input: "test" },
                argsText: '{"input":"test"}',
              },
            ],
            status: { type: "requires-action", reason: "tool-calls" },
          });
        }
        return Promise.resolve({
          content: [{ type: "text", text: "Done with tool" }],
          status: { type: "complete", reason: "stop" },
        });
      }),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter),
    );

    await core.append(createUserAppendMessage("Use a tool"));

    // The assistant message should have a tool-call with no result yet
    // and status requires-action. Now add the tool result.
    const assistantMsg = core.messages[1]!;
    expect(assistantMsg.role).toBe("assistant");

    core.addToolResult({
      messageId: assistantMsg.id,
      toolName: "myTool",
      toolCallId: "tc1",
      result: "tool output",
      isError: false,
    });

    // Wait for the second roundtrip to complete
    await new Promise((r) => setTimeout(r, 100));

    expect(adapter.run).toHaveBeenCalledTimes(2);

    const finalMessages = core.messages;
    const finalAssistant = finalMessages[1]!;
    // Content should include both the tool-call from round 1 and text from round 2
    expect(finalAssistant.content.some((c) => c.type === "tool-call")).toBe(
      true,
    );
    expect(
      finalAssistant.content.some(
        (c) => c.type === "text" && c.text === "Done with tool",
      ),
    ).toBe(true);
  });

  it("stops at maxSteps", async () => {
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockResolvedValue({
        content: [
          {
            type: "tool-call",
            toolCallId: "tc1",
            toolName: "myTool",
            args: {},
            argsText: "{}",
          },
        ],
        status: { type: "requires-action", reason: "tool-calls" },
        metadata: {
          steps: [{ usage: { promptTokens: 10, completionTokens: 5 } }],
        },
      }),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter, { maxSteps: 1 }),
    );

    await core.append(createUserAppendMessage("Tool call"));

    // Add tool result - this should NOT trigger another roundtrip because maxSteps=1
    const assistantMsg = core.messages[1]!;
    core.addToolResult({
      messageId: assistantMsg.id,
      toolName: "myTool",
      toolCallId: "tc1",
      result: "result",
      isError: false,
    });

    // Wait a bit to ensure no additional roundtrip happened
    await new Promise((r) => setTimeout(r, 100));

    // Should have been called only once (the initial run)
    expect(adapter.run).toHaveBeenCalledTimes(1);

    const finalAssistant = core.messages[1]!;
    expect(finalAssistant.status).toBeDefined();
    expect(finalAssistant.status!.type).toBe("incomplete");
    if (finalAssistant.status!.type === "incomplete") {
      expect(finalAssistant.status!.reason).toBe("tool-calls");
    }
  });

  it("capabilities update from options", () => {
    const adapter: ChatModelAdapter = {
      run: vi.fn().mockResolvedValue({ content: [] }),
    };
    const core = new LocalThreadRuntimeCore(
      contextProvider,
      createOptions(adapter),
    );

    // Default capabilities
    expect(core.capabilities.speech).toBe(false);
    expect(core.capabilities.dictation).toBe(false);
    expect(core.capabilities.attachments).toBe(false);
    expect(core.capabilities.feedback).toBe(false);

    // Update with adapters
    core.__internal_setOptions({
      adapters: {
        chatModel: adapter,
        speech: {} as any,
        dictation: {} as any,
        attachments: {} as any,
        feedback: {} as any,
      },
    });

    expect(core.capabilities.speech).toBe(true);
    expect(core.capabilities.dictation).toBe(true);
    expect(core.capabilities.attachments).toBe(true);
    expect(core.capabilities.feedback).toBe(true);

    // Update back to no adapters
    core.__internal_setOptions({
      adapters: { chatModel: adapter },
    });

    expect(core.capabilities.speech).toBe(false);
    expect(core.capabilities.dictation).toBe(false);
    expect(core.capabilities.attachments).toBe(false);
    expect(core.capabilities.feedback).toBe(false);
  });
});
