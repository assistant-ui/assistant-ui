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
  vi.unstubAllGlobals();
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
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
  publish("first");
  host.frameLoaded();
  publish("second");
  expect(host.getModelContext().tools?.search).toBeDefined();

  postMessage.mockClear();
  host.frameLoaded();
  expect(host.getModelContext().tools?.search).toBeDefined();
  expect(postMessage).not.toHaveBeenCalled();

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

it("clears the old document on load before the new document updates", async () => {
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
  publish("first");
  host.frameLoaded();
  const oldCall = call();
  const oldOutcome = oldCall.catch((error: unknown) => error);
  const oldId = lastCallId();

  postMessage.mockClear();
  host.frameLoaded();
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
  const { host, send, publish, call, lastCallId, postMessage } = createHost();
  publish();
  postMessage.mockClear();

  host.frameLoaded();
  expect(host.getModelContext().tools?.search).toBeUndefined();
  expect(postMessage).toHaveBeenCalledWith(
    {
      channel: FRAME_MESSAGE_CHANNEL,
      message: { type: "model-context-request" },
    },
    origin,
  );

  publish();
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
