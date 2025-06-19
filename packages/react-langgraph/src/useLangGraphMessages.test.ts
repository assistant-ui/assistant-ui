import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useLangGraphMessages } from "./useLangGraphMessages";
import { appendLangChainChunk } from "./appendLangChainChunk";
import { MessageContentImageUrl, MessageContentText } from "./types";
import { mockStreamCallbackFactory } from "./testUtils";

const metadataEvent = {
  event: "metadata",
  data: {
    thread_id: "123",
    run_attempt: 1,
  },
};

describe("useLangGraphMessages", {}, () => {
  it("processes chunks correctly", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages.length).toEqual(2);
      expect(result.current.messages[0].type).toEqual("human");
      expect(result.current.messages[1].type).toEqual("ai");
      expect(result.current.messages[1].content).toEqual("");
    });
  });

  it("appends chunks w/ same id", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello!",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: " How may I assist you today?",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human",
            content: "Hello!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages.length).toEqual(2);
      expect(result.current.messages[0].type).toEqual("human");
      expect(result.current.messages[1].type).toEqual("ai");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).text,
      ).toEqual("Hello! How may I assist you today?");
    });
  });

  it("separates chunks w/ different ids", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello!",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-2",
            content: " How may I assist you today?",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human",
            content: "Hello!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages.length).toEqual(3);
      expect(result.current.messages[0].type).toEqual("human");
      expect(result.current.messages[1].type).toEqual("ai");
      expect(result.current.messages[2].type).toEqual("ai");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).text,
      ).toEqual("Hello!");
      expect(result.current.messages[2].content as string).toEqual(
        " How may I assist you today?",
      );
    });
  });

  it("handles a mix of text and image chunks - start with text", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello!",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: " How may I assist you today?",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: [
              {
                type: "image_url",
                image_url: { url: "https://example.com/image.png" },
              },
            ],
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human",
            content: "Hello!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages.length).toEqual(2);
      expect(result.current.messages[0].type).toEqual("human");
      expect(result.current.messages[1].type).toEqual("ai");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).text,
      ).toEqual("Hello! How may I assist you today?");
      expect(
        (result.current.messages[1].content[1] as MessageContentImageUrl).type,
      ).toEqual("image_url");
      const imageChunkContent = result.current.messages[1]
        .content[1] as MessageContentImageUrl;
      expect(typeof imageChunkContent.image_url).toEqual("object");
      expect(
        (
          (result.current.messages[1].content[1] as MessageContentImageUrl)
            .image_url as { url: string }
        ).url,
      ).toEqual("https://example.com/image.png");
    });
  });

  it("handles a mix of text and image chunks - start with image", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: [
              {
                type: "image_url",
                image_url: { url: "https://example.com/image.png" },
              },
            ],
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello!",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: " How may I assist you today?",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human",
            content: "Hello!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages.length).toEqual(2);
      expect(result.current.messages[0].type).toEqual("human");
      expect(result.current.messages[1].type).toEqual("ai");
      expect(
        (result.current.messages[1].content[0] as MessageContentImageUrl).type,
      ).toEqual("image_url");
      const imageChunkContent = result.current.messages[1]
        .content[0] as MessageContentImageUrl;
      expect(typeof imageChunkContent.image_url).toEqual("object");
      expect(
        (
          (result.current.messages[1].content[0] as MessageContentImageUrl)
            .image_url as { url: string }
        ).url,
      ).toEqual("https://example.com/image.png");
      expect(
        (result.current.messages[1].content[1] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1].content[1] as MessageContentText).text,
      ).toEqual("Hello! How may I assist you today?");
    });
  });

  it("processes a mix of chunks and messages", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello!",
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "AIMessageChunk",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
          {
            run_attempt: 1,
          },
        ],
      },
      {
        event: "messages/complete",
        data: [
          {
            id: "run-2",
            content: [{ type: "text", text: "How may I assist you today?" }],
            additional_kwargs: {},
            response_metadata: { model_name: "claude-3-7-sonnet-latest" },
            type: "ai",
            name: null,
            tool_calls: [],
            invalid_tool_calls: [],
            tool_call_chunks: [],
          },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human",
            content: "Hello!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages.length).toEqual(3);
      expect(result.current.messages[0].type).toEqual("human");
      expect(result.current.messages[1].type).toEqual("ai");
      expect(result.current.messages[2].type).toEqual("ai");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1].content[0] as MessageContentText).text,
      ).toEqual("Hello!");
      expect(
        (result.current.messages[2].content[0] as MessageContentText).text,
      ).toEqual("How may I assist you today?");
    });
  });
});
