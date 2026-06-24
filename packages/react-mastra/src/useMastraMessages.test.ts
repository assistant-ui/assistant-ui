import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMastraMessages } from "./useMastraMessages";
import { appendMastraChunk } from "./appendMastraChunk";
import { MastraKnownEventTypes, type MastraStreamCallback } from "./types";

describe("useMastraMessages", () => {
  it("accumulates streamed assistant messages", async () => {
    const stream: MastraStreamCallback = async function* () {
      yield {
        event: MastraKnownEventTypes.MessagePartial,
        data: {
          id: "assistant-1",
          type: "assistant",
          content: "Hello",
          status: "running",
        },
      };
      yield {
        event: MastraKnownEventTypes.MessagePartial,
        data: {
          id: "assistant-1",
          type: "assistant",
          content: " world",
          status: "complete",
        },
      };
    };
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useMastraMessages({
        stream,
        appendMessage: appendMastraChunk,
        eventHandlers: { onError },
      }),
    );

    await act(async () => {
      await result.current.sendMessage([
        { id: "user-1", type: "human", content: "Hi" },
      ]);
    });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.messages).toMatchObject([
      { id: "user-1", type: "human", content: "Hi" },
      {
        id: "assistant-1",
        type: "assistant",
        content: "Hello world",
        status: "complete",
      },
    ]);
  });
});
