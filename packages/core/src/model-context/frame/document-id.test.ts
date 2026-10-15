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
  const publish = (documentId?: string) =>
    send({
      type: "model-context-update",
      ...(documentId && { documentId }),
      context: {
        tools: { search: { parameters: { type: "object" } } },
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
  return { host, send, publish, call, lastCallId, postMessage };
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("expires a late first document when the next page has no provider", async () => {
  vi.useFakeTimers();
  const { host, publish, call, postMessage } = createHost();
  host.frameLoaded();
  publish("first");
  const outcome = call().catch((error: unknown) => error);

  postMessage.mockClear();
  host.frameLoaded();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request" },
    },
    origin,
  );
  vi.advanceTimersByTime(1999);
  expect(host.getModelContext().tools?.search).toBeDefined();
  vi.advanceTimersByTime(1);
  expect(host.getModelContext().tools?.search).toBeUndefined();
  await expect(outcome).resolves.toMatchObject({
    message: "AssistantFrame document has changed",
  });
  host.dispose();
});

it("keeps an early new document when it answers after load", () => {
  vi.useFakeTimers();
  const { host, publish, postMessage } = createHost();
  publish("first");
  publish("second");

  postMessage.mockClear();
  host.frameLoaded();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request" },
    },
    origin,
  );
  publish("second");
  vi.advanceTimersByTime(2000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  host.dispose();
});

it("keeps the initial document announced before its first load when it answers", () => {
  vi.useFakeTimers();
  const { host, publish, postMessage } = createHost();
  publish("first");

  postMessage.mockClear();
  host.frameLoaded();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request" },
    },
    origin,
  );
  publish("first");
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
  const { host, publish } = createHost();
  publish("first");
  host.frameLoaded();
  vi.advanceTimersByTime(1000);
  host.frameLoaded();
  vi.advanceTimersByTime(1000);
  expect(host.getModelContext().tools?.search).toBeDefined();
  vi.advanceTimersByTime(1000);
  expect(host.getModelContext().tools?.search).toBeUndefined();
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
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
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
      message: { type: "model-context-request" },
    },
    origin,
  );
  publish("second");
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
      message: { type: "model-context-request" },
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
      message: { type: "model-context-request" },
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
