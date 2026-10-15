import { afterEach, expect, it, vi } from "vitest";
import { AssistantFrameHost } from "./host";
import { isFrameMessage } from "./validate";
import { FRAME_MESSAGE_CHANNEL } from "./types";

const origin = "https://host.example";

const createHost = () => {
  let receive: (event: MessageEvent) => void = () => {};
  vi.stubGlobal("window", {
    location: { origin },
    addEventListener: vi.fn(
      (_type: string, listener: (event: MessageEvent) => void) => {
        receive = listener;
      },
    ),
    removeEventListener: vi.fn(),
  });
  const postMessage = vi.fn();
  const frame = { postMessage } as unknown as Window;
  const host = new AssistantFrameHost(frame);
  const send = (message: unknown) =>
    receive({
      source: frame,
      origin,
      data: { channel: FRAME_MESSAGE_CHANNEL, message },
    } as MessageEvent);
  const publish = (
    documentId?: string,
    requestId?: string,
    toolName = "search",
  ) =>
    send({
      type: "model-context-update",
      ...(documentId !== undefined && { documentId }),
      ...(requestId !== undefined && { requestId }),
      context: {
        tools: { [toolName]: { parameters: { type: "object" } } },
      },
    });
  const call = () =>
    Promise.resolve(
      host.getModelContext().tools!.search!.execute!({}, {
        abortSignal: new AbortController().signal,
      } as any),
    );
  const lastCallId = () =>
    postMessage.mock.calls
      .filter(([data]) => data.message.type === "tool-call")
      .at(-1)![0].message.id as string;
  const lastRequestId = () =>
    postMessage.mock.calls
      .filter(([data]) => data.message.type === "model-context-request")
      .at(-1)![0].message.requestId as string;
  return { host, send, publish, call, lastCallId, lastRequestId, postMessage };
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("requests initial context without a load request id", () => {
  const { host, postMessage } = createHost();
  expect(postMessage).toHaveBeenCalledExactlyOnceWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request" },
    },
    origin,
  );
  host.dispose();
});

it("restores a timed out document only when it echoes the load request", async () => {
  vi.useFakeTimers();
  const { host, publish, call, lastRequestId, postMessage } = createHost();
  publish("first");
  const outcome = call().catch((error: unknown) => error);
  const subscriber = vi.fn();
  host.subscribe(subscriber);

  postMessage.mockClear();
  host.frameLoaded();
  const requestId = lastRequestId();
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(subscriber).toHaveBeenCalledOnce();
  await expect(outcome).resolves.toMatchObject({
    message: "AssistantFrame document has changed",
  });
  expect(postMessage).not.toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.objectContaining({ type: "tool-cancel" }),
    }),
    expect.anything(),
  );

  publish("first", requestId);
  expect(host.getModelContext().tools?.search).toBeDefined();
  publish("first", undefined, "updatedSearch");
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(host.getModelContext().tools?.updatedSearch).toBeDefined();

  publish("second", undefined, "replacementSearch");
  publish("first", requestId);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(host.getModelContext().tools?.replacementSearch).toBeDefined();
  host.dispose();
});

it("ignores a retired document without the matching load echo", () => {
  vi.useFakeTimers();
  const { host, publish } = createHost();
  publish("first");
  host.frameLoaded();
  vi.advanceTimersByTime(2000);

  publish("first");
  expect(host.getModelContext()).toEqual({});
  publish("first", "unmatched-request");
  expect(host.getModelContext()).toEqual({});
  host.dispose();
});

it("expires a silent replacement despite a queued update from the old document", () => {
  vi.useFakeTimers();
  const { host, publish } = createHost();
  publish("first");
  host.frameLoaded();
  vi.advanceTimersByTime(1000);
  publish("first");
  vi.advanceTimersByTime(1000);
  expect(host.getModelContext()).toEqual({});

  publish("first");
  expect(host.getModelContext()).toEqual({});
  host.dispose();
});

it.each([
  { type: "tool-result", documentId: "first", id: "queued-call" },
  { type: "provider-disposed", documentId: "first" },
  { type: "tool-result", id: "legacy-call" },
])(
  "keeps the load timer running after a queued $type without an answer",
  (message) => {
    vi.useFakeTimers();
    const { host, send, publish } = createHost();
    publish("first");
    host.frameLoaded();
    send(message);
    vi.advanceTimersByTime(2000);
    expect(host.getModelContext()).toEqual({});
    host.dispose();
  },
);

it("accepts a different document's message as a load answer without an echo", () => {
  vi.useFakeTimers();
  const { host, send, publish } = createHost();
  publish("first");
  host.frameLoaded();
  send({ type: "tool-result", documentId: "second", id: "unknown-call" });
  expect(host.getModelContext()).toEqual({});
  vi.advanceTimersByTime(2000);
  publish("second");
  expect(host.getModelContext().tools?.search).toBeDefined();
  host.dispose();
});

it("clears tools and pending calls as soon as another document answers the load", async () => {
  vi.useFakeTimers();
  const { host, publish, call, lastRequestId } = createHost();
  publish("first");
  const outcome = call().catch((error: unknown) => error);
  host.frameLoaded();

  publish("second", lastRequestId(), "replacementSearch");
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(host.getModelContext().tools?.replacementSearch).toBeDefined();
  await expect(outcome).resolves.toMatchObject({
    message: "AssistantFrame document has changed",
  });

  publish("first");
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(host.getModelContext().tools?.replacementSearch).toBeDefined();
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.replacementSearch).toBeDefined();
  host.dispose();
});

it("keeps an early new document when it answers after load", () => {
  vi.useFakeTimers();
  const { host, publish, lastRequestId, postMessage } = createHost();
  publish("first");
  publish("second");

  postMessage.mockClear();
  host.frameLoaded();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request", requestId: expect.any(String) },
    },
    origin,
  );
  publish("second", lastRequestId());
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  host.dispose();
});

it("keeps the initial document announced before its first load when it answers", () => {
  vi.useFakeTimers();
  const { host, publish, lastRequestId, postMessage } = createHost();
  publish("first");

  postMessage.mockClear();
  host.frameLoaded();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request", requestId: expect.any(String) },
    },
    origin,
  );
  publish("first", lastRequestId());
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  host.dispose();
});

it("keeps legacy tools when the provider answers the load request", () => {
  vi.useFakeTimers();
  const { host, publish } = createHost();
  publish();
  host.frameLoaded();
  expect(host.getModelContext().tools?.search).toBeDefined();
  publish();
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  host.dispose();
});

it("restarts the grace period on a later load", () => {
  vi.useFakeTimers();
  const { host, publish, lastRequestId } = createHost();
  publish("first");
  host.frameLoaded();
  const firstRequestId = lastRequestId();
  vi.advanceTimersByTime(1000);
  host.frameLoaded();
  const secondRequestId = lastRequestId();
  expect(secondRequestId).toEqual(expect.any(String));
  expect(secondRequestId).not.toBe(firstRequestId);
  publish("first", firstRequestId);
  vi.advanceTimersByTime(1000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  vi.advanceTimersByTime(1000);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  publish("first", firstRequestId);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  publish("first", secondRequestId);
  expect(host.getModelContext().tools?.search).toBeDefined();
  host.dispose();
});

it("does not let an old document answer a load request", () => {
  vi.useFakeTimers();
  const { host, publish } = createHost();
  publish("first");
  publish("second");
  host.frameLoaded();
  publish("first");
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  host.dispose();
});

it("cancels the grace period when disposed", () => {
  vi.useFakeTimers();
  const { host, publish } = createHost();
  publish("first");
  host.frameLoaded();
  host.dispose();
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();
});

it("rejects an old call and serves the same tool from a new document", async () => {
  const { host, send, publish, call, lastCallId } = createHost();
  publish("first");
  const oldCall = call();
  const oldOutcome = oldCall.catch((error: unknown) => error);
  const oldId = lastCallId();

  publish("second");
  expect(await oldOutcome).toBeInstanceOf(Error);
  expect(host.getModelContext().tools?.search).toBeDefined();

  const newCall = call();
  const newId = lastCallId();
  send({
    type: "tool-result",
    documentId: "first",
    id: oldId,
    result: "stale",
  });
  send({
    type: "tool-result",
    documentId: "second",
    id: newId,
    result: "fresh",
  });
  await expect(newCall).resolves.toBe("fresh");
  host.dispose();
});

it("keeps legacy messages and pending calls working without a document id", async () => {
  const { host, send, publish, call, lastCallId } = createHost();
  publish();
  const result = call();
  publish();
  send({ type: "tool-result", id: lastCallId(), result: "legacy" });
  await expect(result).resolves.toBe("legacy");
  host.dispose();
});

it("keeps a new document's tools and results when its update precedes load", async () => {
  vi.useFakeTimers();
  const { host, send, publish, call, lastCallId, lastRequestId, postMessage } =
    createHost();
  publish("first");
  host.frameLoaded();
  publish("second");
  expect(host.getModelContext().tools?.search).toBeDefined();

  postMessage.mockClear();
  host.frameLoaded();
  expect(host.getModelContext().tools?.search).toBeDefined();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request", requestId: expect.any(String) },
    },
    origin,
  );
  publish("second", lastRequestId());
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();

  const result = call();
  send({
    type: "tool-result",
    documentId: "second",
    id: lastCallId(),
    result: "fresh",
  });
  await expect(result).resolves.toBe("fresh");
  host.dispose();
});

it("clears the old document after load when the new document does not answer", async () => {
  vi.useFakeTimers();
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
  publish("first");
  host.frameLoaded();
  const oldCall = call();
  const oldOutcome = oldCall.catch((error: unknown) => error);
  const oldId = lastCallId();

  postMessage.mockClear();
  host.frameLoaded();
  expect(host.getModelContext().tools?.search).toBeDefined();
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(await oldOutcome).toMatchObject({
    message: "AssistantFrame document has changed",
  });
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request", requestId: expect.any(String) },
    },
    origin,
  );

  send({
    type: "tool-result",
    documentId: "first",
    id: oldId,
    result: "stale",
  });
  publish("second");
  expect(host.getModelContext().tools?.search).toBeDefined();
  const newCall = call();
  send({
    type: "tool-result",
    documentId: "second",
    id: lastCallId(),
    result: "fresh",
  });
  await expect(newCall).resolves.toBe("fresh");
  host.dispose();
});

it("re-requests legacy tools after load", async () => {
  vi.useFakeTimers();
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
  publish();
  postMessage.mockClear();

  host.frameLoaded();
  expect(host.getModelContext().tools?.search).toBeDefined();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request", requestId: expect.any(String) },
    },
    origin,
  );

  publish();
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  const result = call();
  send({ type: "tool-result", id: lastCallId(), result: "legacy" });
  await expect(result).resolves.toBe("legacy");
  host.dispose();
});

it("validates messages with and without a document id", () => {
  for (const type of ["model-context-request", "provider-disposed"]) {
    expect(isFrameMessage({ type })).toBe(true);
    expect(isFrameMessage({ type, documentId: "page" })).toBe(true);
    expect(isFrameMessage({ type, documentId: 42 })).toBe(false);
  }
});

it("validates optional request ids on context requests and updates", () => {
  for (const type of ["model-context-request", "model-context-update"]) {
    const message = { type, context: {} };
    expect(isFrameMessage(message)).toBe(true);
    expect(isFrameMessage({ ...message, requestId: "load-request" })).toBe(
      true,
    );
    expect(isFrameMessage({ ...message, requestId: "" })).toBe(true);
    for (const requestId of [42, null, false, {}, []]) {
      expect(isFrameMessage({ ...message, requestId })).toBe(false);
    }
  }
});

it("stamps tool calls with the document that offered the captured tool", async () => {
  vi.useFakeTimers();
  const { host, publish, call, postMessage } = createHost();
  publish("first");
  const staleTool = host.getModelContext().tools!.search!;
  const firstOutcome = call().catch((error: unknown) => error);
  expect(postMessage.mock.lastCall![0].message).toMatchObject({
    type: "tool-call",
    documentId: "first",
  });

  publish("second");
  await expect(firstOutcome).resolves.toMatchObject({
    message: "AssistantFrame document has changed",
  });
  const staleOutcome = Promise.resolve(
    staleTool.execute!({}, {
      abortSignal: new AbortController().signal,
    } as any),
  ).catch((error: unknown) => error);
  expect(postMessage.mock.lastCall![0].message).toMatchObject({
    type: "tool-call",
    documentId: "first",
  });
  const secondOutcome = call().catch((error: unknown) => error);
  expect(postMessage.mock.lastCall![0].message).toMatchObject({
    type: "tool-call",
    documentId: "second",
  });
  host.dispose();
  await staleOutcome;
  await secondOutcome;
});

it("stamps an empty document id on tool calls from a legacy context", async () => {
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
  publish("first");
  publish();
  const outcome = call();
  expect(postMessage.mock.lastCall![0].message).toHaveProperty(
    "documentId",
    "",
  );
  send({ type: "tool-result", id: lastCallId(), result: "legacy" });
  await expect(outcome).resolves.toBe("legacy");
  host.dispose();
});
