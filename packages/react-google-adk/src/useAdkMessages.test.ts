import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(async () => ({
    remoteId: "thread-1",
    externalId: undefined,
  })),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ threadListItem: { initialize: mocks.initialize } }),
}));

import {
  messageToEvent,
  useAdkMessages,
  type UseAdkMessagesOptions,
} from "./useAdkMessages";
import type { AdkEvent, AdkMessage, AdkStreamCallback } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ADK runtime callbacks", () => {
  it.each(["onAgentTransfer", "onCustomEvent", "onError"] as const)(
    "continues streaming when %s throws",
    async (callbackName) => {
      const callbackError = new Error("telemetry failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const callback = vi.fn(() => {
        throw callbackError;
      });
      const eventByCallback: Record<typeof callbackName, AdkEvent> = {
        onAgentTransfer: {
          id: "transfer",
          actions: { transferToAgent: "researcher" },
        },
        onCustomEvent: {
          id: "custom",
          customMetadata: { progress: 1 },
        },
        onError: {
          id: "error",
          author: "agent",
          errorMessage: "recoverable error",
        },
      };
      const stream: AdkStreamCallback = async function* () {
        yield eventByCallback[callbackName];
        yield {
          id: "answer",
          author: "agent",
          content: { role: "model", parts: [{ text: "done" }] },
        };
      };
      const eventHandlers = {
        [callbackName]: callback,
      } as UseAdkMessagesOptions["eventHandlers"];
      const { result } = renderHook(() =>
        useAdkMessages({ stream, eventHandlers }),
      );

      await act(async () => {
        await result.current.sendMessage(
          [{ id: "user", type: "human", content: "hello" }],
          {},
        );
      });

      expect(result.current.messages.at(-1)).toMatchObject({
        type: "ai",
        content: [{ type: "text", text: "done" }],
      });
      expect(consoleError).toHaveBeenCalledWith(
        `[react-google-adk] ${callbackName} callback threw an error`,
        callbackError,
      );
    },
  );

  it("continues streaming when onCustomEvent rejects", async () => {
    const callbackError = new Error("async telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const stream: AdkStreamCallback = async function* () {
      yield { id: "custom", customMetadata: { progress: 1 } };
      yield {
        id: "answer",
        author: "agent",
        content: { role: "model", parts: [{ text: "done" }] },
      };
    };
    const { result } = renderHook(() =>
      useAdkMessages({
        stream,
        eventHandlers: {
          onCustomEvent: () => Promise.reject(callbackError),
        },
      }),
    );

    await act(async () => {
      await result.current.sendMessage(
        [{ id: "user", type: "human", content: "hello" }],
        {},
      );
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "done" }],
    });
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[react-google-adk] onCustomEvent callback threw an error",
        callbackError,
      );
    });
  });
});

describe("messageToEvent (contentToParts)", () => {
  it("serializes a file content part as inlineData", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        {
          type: "file",
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "report.pdf",
        },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" } },
    ]);
  });

  it("serializes a file_url content part as fileData with mimeType", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        {
          type: "file_url",
          url: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      {
        fileData: {
          fileUri: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      },
    ]);
  });

  it("serializes a file_url without mimeType as bare fileData", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [{ type: "file_url", url: "gs://bucket/unknown" }],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { fileData: { fileUri: "gs://bucket/unknown" } },
    ]);
  });

  it("serializes mixed text + file content as multiple parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        { type: "text", text: "see attached" },
        { type: "file", mimeType: "image/png", data: "AAAA" },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { text: "see attached" },
      { inlineData: { mimeType: "image/png", data: "AAAA" } },
    ]);
  });
});
