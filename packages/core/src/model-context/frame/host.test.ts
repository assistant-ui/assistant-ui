import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFrameHost } from "./host";
import { type FrameMessage, FRAME_MESSAGE_CHANNEL } from "./types";

const executionContext = {
  toolCallId: "tool-call",
  abortSignal: new AbortController().signal,
  human: async () => undefined,
};

const createHost = () => {
  let handleMessage: ((event: MessageEvent) => void) | undefined;
  const addEventListener = vi.fn(
    (_type: string, listener: EventListenerOrEventListenerObject) => {
      handleMessage = listener as (event: MessageEvent) => void;
    },
  );
  const removeEventListener = vi.fn();
  vi.stubGlobal("window", { addEventListener, removeEventListener });

  const postMessage = vi.fn();
  const iframeWindow = { postMessage } as unknown as Window;
  const host = new AssistantFrameHost(iframeWindow);

  const dispatchMessage = (message: FrameMessage) =>
    handleMessage?.({
      source: iframeWindow,
      data: {
        channel: FRAME_MESSAGE_CHANNEL,
        message,
      },
    } as unknown as MessageEvent);

  dispatchMessage({
    type: "model-context-update",
    context: {
      tools: {
        search: {
          type: "frontend",
          parameters: { type: "object", properties: {} },
        },
      },
    },
  });

  const execute = host.getModelContext().tools?.search?.execute;
  if (!execute) throw new Error("Expected the search tool to be available");

  return { dispatchMessage, execute, host, postMessage };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AssistantFrameHost", () => {
  it("resolves tool calls from frame results", async () => {
    const { dispatchMessage, execute, host } = createHost();
    const result = Promise.resolve(
      execute({ query: "weather" }, executionContext),
    );

    dispatchMessage({
      type: "tool-result",
      id: "tool-0",
      result: "sunny",
    });

    await expect(result).resolves.toBe("sunny");
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("rejects pending tool calls when disposed", async () => {
    const { execute, host } = createHost();
    const result = Promise.resolve(execute({}, executionContext));

    host.dispose();

    await expect(result).rejects.toThrow(
      "AssistantFrameHost has been disposed",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects tool calls made after disposal without posting a request", async () => {
    const { execute, host, postMessage } = createHost();
    host.dispose();

    await expect(execute({}, executionContext)).rejects.toThrow(
      "AssistantFrameHost has been disposed",
    );
    expect(postMessage).toHaveBeenCalledOnce();
  });
});
