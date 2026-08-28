import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFrameHost } from "./host";
import { type FrameMessage, FRAME_MESSAGE_CHANNEL } from "./types";

const executionContext = {
  toolCallId: "tool-call",
  abortSignal: new AbortController().signal,
  human: async () => undefined,
};

const DEFAULT_ORIGIN = "https://host.example";

const createHost = (targetOrigin?: string) => {
  let handleMessage: ((event: MessageEvent) => void) | undefined;
  const addEventListener = vi.fn(
    (_type: string, listener: EventListenerOrEventListenerObject) => {
      handleMessage = listener as (event: MessageEvent) => void;
    },
  );
  const removeEventListener = vi.fn();
  vi.stubGlobal("window", {
    addEventListener,
    removeEventListener,
    location: { origin: DEFAULT_ORIGIN },
  });

  const postMessage = vi.fn();
  const iframeWindow = { postMessage } as unknown as Window;
  const host = new AssistantFrameHost(iframeWindow, targetOrigin);

  const dispatchMessage = (
    message: FrameMessage,
    origin = targetOrigin ?? DEFAULT_ORIGIN,
  ) =>
    handleMessage?.({
      source: iframeWindow,
      origin,
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

  const getToolCallId = () => {
    const call = postMessage.mock.calls.find(
      ([data]) => data.message.type === "tool-call",
    );
    if (!call) throw new Error("Expected a tool call to be posted");
    return call[0].message.id as string;
  };

  return { dispatchMessage, execute, getToolCallId, host, postMessage };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AssistantFrameHost", () => {
  it("defaults to the current origin", () => {
    const { host, postMessage } = createHost();

    expect(postMessage).toHaveBeenCalledWith(expect.anything(), DEFAULT_ORIGIN);

    host.dispose();
  });

  it("ignores context updates from another origin", () => {
    const { dispatchMessage, host } = createHost();

    dispatchMessage(
      {
        type: "model-context-update",
        context: { system: "untrusted instructions" },
      },
      "https://untrusted.example",
    );

    expect(host.getModelContext().system).toBeUndefined();
    host.dispose();
  });

  it("allows an explicit wildcard origin", () => {
    const { dispatchMessage, host, postMessage } = createHost("*");

    dispatchMessage(
      {
        type: "model-context-update",
        context: { system: "cross-origin instructions" },
      },
      "https://iframe.example",
    );

    expect(postMessage).toHaveBeenCalledWith(expect.anything(), "*");
    expect(host.getModelContext().system).toBe("cross-origin instructions");
    host.dispose();
  });

  it("resolves tool calls from frame results", async () => {
    const { dispatchMessage, execute, getToolCallId, host } = createHost();
    const result = Promise.resolve(
      execute({ query: "weather" }, executionContext),
    );

    dispatchMessage({
      type: "tool-result",
      id: getToolCallId(),
      result: "sunny",
    });

    await expect(result).resolves.toBe("sunny");
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("rejects tool results that carry an empty error message", async () => {
    const { dispatchMessage, execute, getToolCallId, host } = createHost();
    const result = Promise.resolve(
      execute({ query: "weather" }, executionContext),
    );

    dispatchMessage({
      type: "tool-result",
      id: getToolCallId(),
      error: "",
    });

    await expect(result).rejects.toThrow();
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("resolves results from guests that serialize an absent error as null", async () => {
    const { dispatchMessage, execute, getToolCallId, host } = createHost();
    const result = Promise.resolve(
      execute({ query: "weather" }, executionContext),
    );

    dispatchMessage({
      type: "tool-result",
      id: getToolCallId(),
      result: "sunny",
      error: null,
    } as unknown as FrameMessage);

    await expect(result).resolves.toBe("sunny");
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("rejects pending tool calls when disposed", async () => {
    const { execute, getToolCallId, host, postMessage } = createHost();
    const result = Promise.resolve(execute({}, executionContext));
    const toolCallId = getToolCallId();

    host.dispose();

    await expect(result).rejects.toThrow(
      "AssistantFrameHost has been disposed",
    );
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        channel: FRAME_MESSAGE_CHANNEL,
        message: { type: "tool-cancel", id: toolCallId },
      },
      DEFAULT_ORIGIN,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects pending tool calls when execution is aborted", async () => {
    const { execute, getToolCallId, host, postMessage } = createHost();
    const abortController = new AbortController();
    const abortError = new Error("Run cancelled");
    abortError.name = "AbortError";
    const result = Promise.resolve(
      execute(
        {},
        {
          ...executionContext,
          abortSignal: abortController.signal,
        },
      ),
    );
    const onRejected = vi.fn();
    void result.catch(onRejected);
    const toolCallId = getToolCallId();

    abortController.abort(abortError);
    await Promise.resolve();

    expect(onRejected).toHaveBeenCalledWith(abortError);
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        channel: FRAME_MESSAGE_CHANNEL,
        message: { type: "tool-cancel", id: toolCallId },
      },
      DEFAULT_ORIGIN,
    );
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("cancels tool calls when they time out", async () => {
    const { execute, getToolCallId, host, postMessage } = createHost();
    const result = Promise.resolve(execute({}, executionContext));
    const toolCallId = getToolCallId();
    const rejection = expect(result).rejects.toThrow(
      'Tool call "search" timed out',
    );

    await vi.advanceTimersByTimeAsync(30000);

    await rejection;
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        channel: FRAME_MESSAGE_CHANNEL,
        message: { type: "tool-cancel", id: toolCallId },
      },
      DEFAULT_ORIGIN,
    );
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("uses unique tool IDs across host instances", () => {
    const first = createHost();
    const second = createHost();

    void first.execute({}, executionContext).catch(() => undefined);
    void second.execute({}, executionContext).catch(() => undefined);

    expect(first.getToolCallId()).not.toBe(second.getToolCallId());

    first.host.dispose();
    second.host.dispose();
  });

  it("does not post tool calls when execution is already aborted", async () => {
    const { execute, host, postMessage } = createHost();
    const abortController = new AbortController();
    const abortError = new Error("Run cancelled");
    abortError.name = "AbortError";
    abortController.abort(abortError);

    await expect(
      execute(
        {},
        {
          ...executionContext,
          abortSignal: abortController.signal,
        },
      ),
    ).rejects.toBe(abortError);

    expect(postMessage).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it("rejects tool calls made after disposal without posting a request", async () => {
    const { execute, host, postMessage } = createHost();
    host.dispose();

    await expect(execute({}, executionContext)).rejects.toThrow(
      "AssistantFrameHost has been disposed",
    );
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it("isolates subscriber errors while applying context updates", () => {
    const { dispatchMessage, host } = createHost();
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();

    host.subscribe(() => {
      throw error;
    });
    host.subscribe(laterSubscriber);

    expect(() =>
      dispatchMessage({
        type: "model-context-update",
        context: { system: "frame instructions" },
      }),
    ).toThrow(error);

    expect(host.getModelContext().system).toBe("frame instructions");
    expect(laterSubscriber).toHaveBeenCalledOnce();

    host.dispose();
  });
});
