/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFrameProvider } from "./provider";
import { FRAME_MESSAGE_CHANNEL } from "./types";

describe("AssistantFrameProvider", () => {
  let messageHandler: ((event: MessageEvent) => void) | undefined;
  let parentWindow: Window;

  const dispatchToolCall = (
    origin: string,
    source: Window = parentWindow,
    id = "tool-call-1",
  ) => {
    messageHandler?.(
      new MessageEvent("message", {
        data: {
          channel: FRAME_MESSAGE_CHANNEL,
          message: {
            type: "tool-call",
            id,
            toolName: "sensitiveTool",
            args: {},
          },
        },
        origin,
        source,
      }),
    );
  };

  const dispatchToolCancel = (
    origin: string,
    source: Window = parentWindow,
    id = "tool-call-1",
  ) => {
    messageHandler?.(
      new MessageEvent("message", {
        data: {
          channel: FRAME_MESSAGE_CHANNEL,
          message: { type: "tool-cancel", id },
        },
        origin,
        source,
      }),
    );
  };

  beforeEach(() => {
    parentWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;

    Object.defineProperty(window, "parent", {
      value: parentWindow,
      configurable: true,
    });

    vi.spyOn(window, "addEventListener").mockImplementation(
      (event, listener) => {
        if (event === "message" && typeof listener === "function") {
          messageHandler = listener as (event: MessageEvent) => void;
        }
      },
    );
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    AssistantFrameProvider.dispose();
    vi.restoreAllMocks();
  });

  it("only accepts tool calls from the parent window", async () => {
    const execute = vi.fn(async () => "result");
    AssistantFrameProvider.addModelContextProvider(
      {
        getModelContext: () => ({
          tools: {
            sensitiveTool: { execute },
          },
        }),
      },
      "https://parent.example",
    );

    const otherWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;

    dispatchToolCall("https://parent.example", otherWindow);

    expect(execute).not.toHaveBeenCalled();

    dispatchToolCall("https://parent.example");

    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  });

  it("reports a failure even when the thrown error has an empty message", async () => {
    const execute = vi.fn(async () => {
      throw new Error();
    });
    AssistantFrameProvider.addModelContextProvider({
      getModelContext: () => ({
        tools: {
          sensitiveTool: { execute },
        },
      }),
    });

    dispatchToolCall("https://parent.example");

    await vi.waitFor(() => {
      const frame = (
        parentWindow.postMessage as ReturnType<typeof vi.fn>
      ).mock.calls
        .map(([data]) => data)
        .find((data) => data?.message?.type === "tool-result");
      expect(frame).toBeDefined();
      expect(frame.message).toHaveProperty("error");
      expect(frame.message).not.toHaveProperty("result");
    });
  });

  it("aborts in-flight tool calls when the parent cancels them", async () => {
    let toolSignal: AbortSignal | undefined;
    const execute = vi.fn(
      async (_args: unknown, context: { abortSignal: AbortSignal }) => {
        toolSignal = context.abortSignal;
        await new Promise<never>((_resolve, reject) => {
          context.abortSignal.addEventListener(
            "abort",
            () => reject(context.abortSignal.reason),
            { once: true },
          );
        });
      },
    );
    AssistantFrameProvider.addModelContextProvider({
      getModelContext: () => ({
        tools: { sensitiveTool: { execute } },
      }),
    });

    dispatchToolCall("*");
    await vi.waitFor(() => expect(toolSignal).toBeDefined());

    dispatchToolCancel("*");

    expect(toolSignal?.aborted).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(parentWindow.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ type: "tool-result" }),
      }),
      expect.anything(),
    );
  });

  it("cancels only the matching in-flight tool call", async () => {
    const signals = new Map<string, AbortSignal>();
    const execute = vi.fn(
      async (
        _args: unknown,
        context: { toolCallId: string; abortSignal: AbortSignal },
      ) => {
        signals.set(context.toolCallId, context.abortSignal);
        await new Promise<never>((_resolve, reject) => {
          context.abortSignal.addEventListener(
            "abort",
            () => reject(context.abortSignal.reason),
            { once: true },
          );
        });
      },
    );
    AssistantFrameProvider.addModelContextProvider({
      getModelContext: () => ({ tools: { sensitiveTool: { execute } } }),
    });

    dispatchToolCall("*", parentWindow, "tool-a");
    dispatchToolCall("*", parentWindow, "tool-b");
    await vi.waitFor(() => expect(signals.size).toBe(2));

    dispatchToolCancel("*", parentWindow, "tool-a");

    expect(signals.get("tool-a")?.aborted).toBe(true);
    expect(signals.get("tool-b")?.aborted).toBe(false);
  });

  it("aborts an earlier call when a duplicate ID arrives", async () => {
    const signals: AbortSignal[] = [];
    const execute = vi.fn(
      async (_args: unknown, context: { abortSignal: AbortSignal }) => {
        signals.push(context.abortSignal);
        await new Promise<never>((_resolve, reject) => {
          context.abortSignal.addEventListener(
            "abort",
            () => reject(context.abortSignal.reason),
            { once: true },
          );
        });
      },
    );
    AssistantFrameProvider.addModelContextProvider({
      getModelContext: () => ({ tools: { sensitiveTool: { execute } } }),
    });

    dispatchToolCall("*", parentWindow, "duplicate");
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    dispatchToolCall("*", parentWindow, "duplicate");
    await vi.waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("aborts in-flight tool calls when the provider is disposed", async () => {
    let toolSignal: AbortSignal | undefined;
    const execute = vi.fn(
      async (_args: unknown, context: { abortSignal: AbortSignal }) => {
        toolSignal = context.abortSignal;
        await new Promise<never>((_resolve, reject) => {
          context.abortSignal.addEventListener(
            "abort",
            () => reject(context.abortSignal.reason),
            { once: true },
          );
        });
      },
    );
    AssistantFrameProvider.addModelContextProvider({
      getModelContext: () => ({ tools: { sensitiveTool: { execute } } }),
    });

    dispatchToolCall("*");
    await vi.waitFor(() => expect(toolSignal).toBeDefined());

    AssistantFrameProvider.dispose();

    expect(toolSignal?.aborted).toBe(true);
    expect(parentWindow.postMessage).toHaveBeenCalledWith(
      {
        channel: FRAME_MESSAGE_CHANNEL,
        message: {
          type: "tool-result",
          id: "tool-call-1",
          error: "AssistantFrameProvider has been disposed",
        },
      },
      { targetOrigin: "*" },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const toolResults = vi
      .mocked(parentWindow.postMessage)
      .mock.calls.filter(
        ([data]) =>
          (data as { message?: { type?: string } }).message?.type ===
          "tool-result",
      );
    expect(toolResults).toHaveLength(1);
  });

  it("upgrades a wildcard origin policy when a strict provider registers", async () => {
    AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "*",
    );

    const execute = vi.fn(async () => "result");
    AssistantFrameProvider.addModelContextProvider(
      {
        getModelContext: () => ({
          tools: {
            sensitiveTool: { execute },
          },
        }),
      },
      "https://parent.example",
    );

    expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
      expect.anything(),
      "https://parent.example",
    );

    dispatchToolCall("https://untrusted.example");

    expect(execute).not.toHaveBeenCalled();

    dispatchToolCall("https://parent.example");

    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  });

  it("does not downgrade a strict origin policy for a wildcard provider", async () => {
    const execute = vi.fn(async () => "result");
    AssistantFrameProvider.addModelContextProvider(
      {
        getModelContext: () => ({
          tools: {
            sensitiveTool: { execute },
          },
        }),
      },
      "https://parent.example",
    );
    AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "*",
    );

    dispatchToolCall("https://untrusted.example");

    expect(execute).not.toHaveBeenCalled();

    dispatchToolCall("https://parent.example");

    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  });

  it("rejects conflicting strict origin policies", () => {
    AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "https://first.example",
    );

    expect(() =>
      AssistantFrameProvider.addModelContextProvider(
        { getModelContext: () => ({}) },
        "https://second.example",
      ),
    ).toThrow(
      'AssistantFrameProvider cannot register conflicting target origins: "https://first.example" and "https://second.example"',
    );
  });

  it("resets the origin policy after every provider unsubscribes", () => {
    const unsubscribe = AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "https://first.example",
    );

    unsubscribe();

    expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
      expect.anything(),
      "*",
    );

    expect(() =>
      AssistantFrameProvider.addModelContextProvider(
        { getModelContext: () => ({}) },
        "https://second.example",
      ),
    ).not.toThrow();
    expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
      expect.anything(),
      "https://second.example",
    );
  });

  it("treats a second unsubscribe as a no-op", () => {
    const unsubscribe = AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "https://first.example",
    );

    unsubscribe();
    unsubscribe();

    const unsubscribeSecond = AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "https://second.example",
    );
    expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
      expect.anything(),
      "https://second.example",
    );

    unsubscribeSecond();
    unsubscribeSecond();

    expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
      expect.anything(),
      "*",
    );
  });

  it("recomputes the origin policy from providers that remain", () => {
    AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "*",
    );
    const unsubscribeStrict = AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "https://parent.example",
    );

    unsubscribeStrict();

    expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
      expect.anything(),
      "*",
    );
  });

  it("keeps a shared strict origin after one provider unsubscribes", async () => {
    const unsubscribeFirst = AssistantFrameProvider.addModelContextProvider(
      { getModelContext: () => ({}) },
      "https://parent.example",
    );
    const execute = vi.fn(async () => "result");
    AssistantFrameProvider.addModelContextProvider(
      {
        getModelContext: () => ({
          tools: {
            sensitiveTool: { execute },
          },
        }),
      },
      "https://parent.example",
    );

    unsubscribeFirst();

    dispatchToolCall("https://untrusted.example");
    expect(execute).not.toHaveBeenCalled();

    dispatchToolCall("https://parent.example");
    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  });
});
