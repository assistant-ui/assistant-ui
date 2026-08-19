/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFrameProvider } from "./provider";
import { FRAME_MESSAGE_CHANNEL } from "./types";

describe("AssistantFrameProvider", () => {
  let messageHandler: ((event: MessageEvent) => void) | undefined;
  let parentWindow: Window;

  const toolCall = {
    channel: FRAME_MESSAGE_CHANNEL,
    message: {
      type: "tool-call",
      id: "tool-call-1",
      toolName: "sensitiveTool",
      args: {},
    },
  };

  const dispatchToolCall = (origin: string, source: Window = parentWindow) => {
    messageHandler?.(
      new MessageEvent("message", {
        data: toolCall,
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
