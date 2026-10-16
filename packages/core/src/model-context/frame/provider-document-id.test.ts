// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { AssistantFrameProvider } from "./provider";
import { FRAME_MESSAGE_CHANNEL } from "./types";

afterEach(() => {
  AssistantFrameProvider.dispose();
  vi.restoreAllMocks();
});

it("sends one document id on updates, replies, and disposal", () => {
  const parent = { postMessage: vi.fn() } as unknown as Window;
  Object.defineProperty(window, "parent", {
    value: parent,
    configurable: true,
  });
  let receive: (event: MessageEvent) => void = () => {};
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
    if (type === "message" && typeof listener === "function") {
      receive = listener as (event: MessageEvent) => void;
    }
  });

  AssistantFrameProvider.addModelContextProvider({
    getModelContext: () => ({ system: "current page" }),
  });
  receive(
    new MessageEvent("message", {
      source: parent,
      origin: window.location.origin,
      data: {
        channel: FRAME_MESSAGE_CHANNEL,
        message: { type: "model-context-request" },
      },
    }),
  );
  AssistantFrameProvider.dispose();

  const messages = vi
    .mocked(parent.postMessage)
    .mock.calls.map(
      ([data]) => (data as { message: { documentId?: string } }).message,
    );
  const id = messages[0]?.documentId;
  expect(id).toEqual(expect.any(String));
  expect(id!.length).toBeGreaterThan(0);
  expect(messages.length).toBeGreaterThanOrEqual(3);
  expect(messages.every((message) => message.documentId === id)).toBe(true);
});
