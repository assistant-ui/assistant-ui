import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useLangGraphMessages } from "./useLangGraphMessages";
import { appendLangChainChunk } from "./appendLangChainChunk";
import type {
  LangChainMessageChunk,
  LangGraphTupleMetadata,
  MessageContentImageUrl,
  MessageContentText,
} from "./types";
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
      expect(result.current.messages[0]!.type).toEqual("human");
      expect(result.current.messages[1]!.type).toEqual("ai");
      expect(result.current.messages[1]!.content).toEqual("");
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
      expect(result.current.messages[0]!.type).toEqual("human");
      expect(result.current.messages[1]!.type).toEqual("ai");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).text,
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
      expect(result.current.messages[0]!.type).toEqual("human");
      expect(result.current.messages[1]!.type).toEqual("ai");
      expect(result.current.messages[2]!.type).toEqual("ai");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).text,
      ).toEqual("Hello!");
      expect(result.current.messages[2]!.content as string).toEqual(
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
      expect(result.current.messages[0]!.type).toEqual("human");
      expect(result.current.messages[1]!.type).toEqual("ai");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).text,
      ).toEqual("Hello! How may I assist you today?");
      expect(
        (result.current.messages[1]!.content[1] as MessageContentImageUrl).type,
      ).toEqual("image_url");
      const imageChunkContent = result.current.messages[1]!
        .content[1] as MessageContentImageUrl;
      expect(typeof imageChunkContent.image_url).toEqual("object");
      expect(
        (
          (result.current.messages[1]!.content[1] as MessageContentImageUrl)
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
      expect(result.current.messages[0]!.type).toEqual("human");
      expect(result.current.messages[1]!.type).toEqual("ai");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentImageUrl).type,
      ).toEqual("image_url");
      const imageChunkContent = result.current.messages[1]!
        .content[0] as MessageContentImageUrl;
      expect(typeof imageChunkContent.image_url).toEqual("object");
      expect(
        (
          (result.current.messages[1]!.content[0] as MessageContentImageUrl)
            .image_url as { url: string }
        ).url,
      ).toEqual("https://example.com/image.png");
      expect(
        (result.current.messages[1]!.content[1] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1]!.content[1] as MessageContentText).text,
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
      expect(result.current.messages[0]!.type).toEqual("human");
      expect(result.current.messages[1]!.type).toEqual("ai");
      expect(result.current.messages[2]!.type).toEqual("ai");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).type,
      ).toEqual("text");
      expect(
        (result.current.messages[1]!.content[0] as MessageContentText).text,
      ).toEqual("Hello!");
      expect(
        (result.current.messages[2]!.content[0] as MessageContentText).text,
      ).toEqual("How may I assist you today?");
    });
  });

  it("updates AI message status when error event is received", async () => {
    const errorData = {
      error: "BadRequestError",
      message:
        "Error code: 400 - {'error': {'message': 'Invalid parameter...'}}",
    };

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-msg-1",
            content: "I'll help you with",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "error",
        data: errorData,
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
        [{ type: "human", content: "Help me with a task" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);

      const humanMessage = result.current.messages[0]!;
      const aiMessage = result.current.messages[1]!;

      expect(humanMessage.type).toBe("human");

      if (aiMessage.type === "ai") {
        expect(aiMessage.id).toBe("ai-msg-1");

        expect((aiMessage as Record<string, unknown>).status).toEqual({
          type: "incomplete",
          reason: "error",
          error: errorData,
        });

        expect(aiMessage.content).toBe("I'll help you with");
      } else {
        throw new Error("Expected AI message");
      }
    });
  });

  it("ensures consistent message IDs in accumulator", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([metadataEvent]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    // Test that messages without IDs get properly assigned IDs
    act(() => {
      result.current.sendMessage(
        [
          {
            type: "human" as const,
            content: "Test message without ID",
            // Note: no id field provided
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      const message = result.current.messages[0]!;
      expect(message.id).toBeDefined();
      expect(message.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ); // UUID v4 format
    });
  });

  it("replaces messages with full list from updates event", async () => {
    const initialHumanMessage = {
      id: "user-1",
      type: "human" as const,
      content: "initial user message",
    };

    const manuallyAddedAIMessage = {
      id: "ai-1",
      type: "ai" as const,
      content: "This is a manually added message from an Updates event",
    };

    const updatedMessagesFromBackend = [
      initialHumanMessage,
      manuallyAddedAIMessage,
    ];

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "updates",
        data: {
          messages: updatedMessagesFromBackend,
        },
      },
      {
        event: "messages",
        data: [
          {
            id: "ai-2",
            content: "This is a streamed AI response",
            type: "AIMessageChunk",
          },
          { run_attempt: 1 },
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
      result.current.sendMessage([initialHumanMessage], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[0]!.id).toEqual("user-1");
      expect(result.current.messages[1]!.id).toEqual("ai-1");
      expect(result.current.messages[1]!.content).toEqual(
        "This is a manually added message from an Updates event",
      );
      expect(result.current.messages[2]!.id).toEqual("ai-2");
      expect(result.current.messages[2]!.content).toEqual(
        "This is a streamed AI response",
      );
    });
  });

  it("does not replace tuple-accumulated messages with updates snapshots", async () => {
    const initialHumanMessage = {
      id: "user-1",
      type: "human" as const,
      content: "Search now",
    };

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Looking that up...",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "tool-msg-1",
            type: "tool",
            content: '{"success":true}',
            name: "cached_search_web",
            tool_call_id: "tool-1",
            status: "success",
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "updates",
        data: {
          messages: [
            initialHumanMessage,
            {
              id: "run-1",
              type: "ai" as const,
              content: "Looking that up...",
            },
          ],
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([initialHumanMessage], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      const toolMessage = result.current.messages[2]!;
      expect(toolMessage.type).toBe("tool");
      if (toolMessage.type !== "tool") {
        throw new Error("Expected tool message");
      }

      expect(toolMessage.id).toBe("tool-msg-1");
      expect(toolMessage.tool_call_id).toBe("tool-1");
      expect(toolMessage.content).toBe('{"success":true}');
    });
  });

  it("fires onMessageChunk callback with chunk and metadata", async () => {
    const chunksCaptured: Array<{
      chunk: LangChainMessageChunk;
      metadata: LangGraphTupleMetadata;
    }> = [];

    const tupleMetadata = {
      langgraph_step: 1,
      langgraph_node: "agent",
      ls_model_name: "claude-3-7-sonnet-latest",
    };

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello!",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          tupleMetadata,
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: {
          onMessageChunk: (chunk, metadata) => {
            chunksCaptured.push({ chunk, metadata });
          },
        },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "Hi" }], {});
    });

    await waitFor(() => {
      expect(chunksCaptured).toHaveLength(1);
      expect(chunksCaptured[0]!.chunk.type).toBe("AIMessageChunk");
      expect(chunksCaptured[0]!.chunk.content).toBe("Hello!");
      expect(chunksCaptured[0]!.metadata).toEqual(tupleMetadata);
    });
  });

  it("accumulates metadata per message ID across chunks", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Hello",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          {
            langgraph_step: 1,
            langgraph_node: "agent",
          },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: " world!",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          {
            langgraph_step: 1,
            ls_model_name: "claude-3-7-sonnet-latest",
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
      result.current.sendMessage([{ type: "human", content: "Hi" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const metadata = result.current.messageMetadata.get("run-1");
      expect(metadata).toBeDefined();
      expect(metadata!.langgraph_step).toBe(1);
      expect(metadata!.langgraph_node).toBe("agent");
      expect(metadata!.ls_model_name).toBe("claude-3-7-sonnet-latest");
    });
  });

  it("fires onUpdates callback", async () => {
    let capturedUpdates: unknown;

    const updatesData = {
      messages: [
        { id: "user-1", type: "human" as const, content: "hi" },
        { id: "ai-1", type: "ai" as const, content: "hello" },
      ],
    };

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "updates",
        data: updatesData,
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: {
          onUpdates: (data) => {
            capturedUpdates = data;
          },
        },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(capturedUpdates).toEqual(updatesData);
    });
  });

  it("fires onValues callback", async () => {
    let capturedValues: unknown;

    const valuesData = {
      messages: [{ id: "ai-1", type: "ai", content: "result" }],
    };

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "values",
        data: valuesData,
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: {
          onValues: (data) => {
            capturedValues = data;
          },
        },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(capturedValues).toEqual(valuesData);
    });
  });

  it("passes checkpointId through to stream callback", async () => {
    const streamSpy = vi
      .fn()
      .mockImplementation(mockStreamCallbackFactory([metadataEvent]));

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ type: "human", content: "edited message" }],
        { checkpointId: "cp-123" },
      );
    });

    await waitFor(() => {
      expect(streamSpy).toHaveBeenCalledTimes(1);
      const config = streamSpy.mock.calls[0]![1];
      expect(config.checkpointId).toBe("cp-123");
    });
  });

  it("uses fresh messages after setMessages (stale closure fix)", async () => {
    const streamSpy = vi
      .fn()
      .mockImplementation(mockStreamCallbackFactory([metadataEvent]));

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy,
        appendMessage: appendLangChainChunk,
      }),
    );

    // First: send a message to populate state
    act(() => {
      result.current.sendMessage(
        [{ id: "h1", type: "human", content: "first" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]!.id).toBe("h1");
    });

    // Simulate truncation (like onEdit does) then immediately send
    act(() => {
      result.current.setMessages([]);
      result.current.sendMessage(
        [{ id: "h2", type: "human", content: "edited" }],
        {},
      );
    });

    await waitFor(() => {
      // After truncation + send, should only have the new message
      // NOT the old "h1" message (which would happen with stale closure)
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]!.id).toBe("h2");
      expect(result.current.messages[0]!.content).toBe("edited");
    });
  });

  it("passes checkpointId alongside other config fields", async () => {
    const streamSpy = vi
      .fn()
      .mockImplementation(mockStreamCallbackFactory([metadataEvent]));

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "test" }], {
        checkpointId: "cp-456",
        command: { resume: "yes" },
        runConfig: { model: "gpt-4" },
      });
    });

    await waitFor(() => {
      expect(streamSpy).toHaveBeenCalledTimes(1);
      const config = streamSpy.mock.calls[0]![1];
      expect(config.checkpointId).toBe("cp-456");
      expect(config.command).toEqual({ resume: "yes" });
      expect(config.runConfig).toEqual({ model: "gpt-4" });
      expect(config.abortSignal).toBeInstanceOf(AbortSignal);
      expect(typeof config.initialize).toBe("function");
    });
  });

  it("swallows AbortError when stream is cancelled", async () => {
    const streamSpy = vi.fn().mockImplementation(async (_messages, config) => {
      async function* streamResponse() {
        await new Promise<void>((_resolve, reject) => {
          const onAbort = () => {
            const abortError = new Error("The operation was aborted.");
            abortError.name = "AbortError";
            reject(abortError);
          };

          if (config.abortSignal.aborted) {
            onAbort();
            return;
          }

          config.abortSignal.addEventListener("abort", onAbort, {
            once: true,
          });
        });
      }

      return streamResponse();
    });

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy,
        appendMessage: appendLangChainChunk,
      }),
    );

    let sendMessagePromise!: Promise<void>;
    act(() => {
      sendMessagePromise = result.current.sendMessage(
        [{ type: "human", content: "cancel me" }],
        {},
      );
    });

    await waitFor(() => {
      expect(streamSpy).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.cancel();
    });

    await expect(sendMessagePromise).resolves.toBeUndefined();
  });

  it("rethrows non-AbortError stream failures", async () => {
    const streamError = new Error("stream failed");
    const streamSpy = vi.fn().mockImplementation(async () => {
      async function* streamResponse() {
        yield metadataEvent;
        throw streamError;
      }

      return streamResponse();
    });

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy,
        appendMessage: appendLangChainChunk,
      }),
    );

    let sendMessagePromise!: Promise<void>;
    act(() => {
      sendMessagePromise = result.current.sendMessage(
        [{ type: "human", content: "trigger error" }],
        {},
      );
    });

    await expect(sendMessagePromise).rejects.toBe(streamError);
  });

  it("normalizes python tool_call_chunks args_json in messages tuple streams", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: "tool-1",
                index: 1,
                name: "fetch_page_content",
                args_json: "",
              },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: "tool-1",
                index: 1,
                name: "fetch_page_content",
                args_json: '{"url":"https://',
              },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: "tool-1",
                index: 1,
                name: "fetch_page_content",
                args_json: 'example.com"}',
              },
            ],
          },
          { run_attempt: 1 },
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
      result.current.sendMessage([{ type: "human", content: "Go" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.type).toBe("ai");
      if (aiMessage.type !== "ai") {
        throw new Error("Expected AI message");
      }

      expect(aiMessage.tool_calls).toHaveLength(1);
      expect(aiMessage.tool_calls?.[0]?.partial_json).toBe(
        '{"url":"https://example.com"}',
      );
      expect(aiMessage.tool_calls?.[0]?.partial_json).not.toContain(
        "undefined",
      );
      expect(aiMessage.tool_calls?.[0]?.args).toMatchObject({
        url: "https://example.com",
      });
    });
  });

  it("handles tool_call_chunks with index 0 (tool_use as first content block)", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: "toolu_xxx",
                index: 0,
                name: "explore_schema",
                args: "",
              },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: "toolu_xxx",
                index: 0,
                name: "explore_schema",
                args: '{"q":"hello"}',
              },
            ],
          },
          { run_attempt: 1 },
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
      result.current.sendMessage([{ type: "human", content: "Go" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.type).toBe("ai");
      if (aiMessage.type !== "ai") {
        throw new Error("Expected AI message");
      }

      expect(aiMessage.tool_calls).toHaveLength(1);
      expect(aiMessage.tool_calls?.[0]?.id).toBe("toolu_xxx");
      expect(aiMessage.tool_calls?.[0]?.name).toBe("explore_schema");
      expect(aiMessage.tool_calls?.[0]?.args).toMatchObject({ q: "hello" });
    });
  });

  it("handles Bedrock tool_call_chunks with null id/name on continuation chunks", async () => {
    // Bedrock only sends id and name on the first chunk.
    // Subsequent chunks carry the args but have id: null, name: null.
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: "tooluse_abc123",
                index: 1,
                name: "read_file",
                args: null,
              },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: null,
                index: 1,
                name: null,
                args: '{"file_path"',
              },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              {
                id: null,
                index: 1,
                name: null,
                args: ': "/foo/bar"}',
              },
            ],
          },
          { run_attempt: 1 },
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
      result.current.sendMessage([{ type: "human", content: "Go" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.type).toBe("ai");
      if (aiMessage.type !== "ai") {
        throw new Error("Expected AI message");
      }

      expect(aiMessage.tool_calls).toHaveLength(1);
      expect(aiMessage.tool_calls?.[0]?.id).toBe("tooluse_abc123");
      expect(aiMessage.tool_calls?.[0]?.name).toBe("read_file");
      expect(aiMessage.tool_calls?.[0]?.partial_json).toBe(
        '{"file_path": "/foo/bar"}',
      );
      expect(aiMessage.tool_calls?.[0]?.partial_json).not.toContain(
        "undefined",
      );
      expect(aiMessage.tool_calls?.[0]?.args).toMatchObject({
        file_path: "/foo/bar",
      });
    });
  });

  it("handles multiple Bedrock tool calls with null id/name matched by index", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      // First chunks for two tool calls — these carry id and name
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: "tool_a", index: 0, name: "search", args: null },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: "tool_b", index: 1, name: "read_file", args: null },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      // Continuation chunks — null id/name, must match by index
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: null, index: 0, name: null, args: '{"q":"he' },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: null, index: 1, name: null, args: '{"path":"/a' },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: null, index: 0, name: null, args: 'llo"}' },
            ],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: null, index: 1, name: null, args: '/b"}' },
            ],
          },
          { run_attempt: 1 },
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
      result.current.sendMessage([{ type: "human", content: "Go" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.type).toBe("ai");
      if (aiMessage.type !== "ai") throw new Error("Expected AI message");

      expect(aiMessage.tool_calls).toHaveLength(2);

      // First tool call (index 0) — args must not cross-wire with index 1
      expect(aiMessage.tool_calls?.[0]?.id).toBe("tool_a");
      expect(aiMessage.tool_calls?.[0]?.name).toBe("search");
      expect(aiMessage.tool_calls?.[0]?.args).toMatchObject({ q: "hello" });

      // Second tool call (index 1)
      expect(aiMessage.tool_calls?.[1]?.id).toBe("tool_b");
      expect(aiMessage.tool_calls?.[1]?.name).toBe("read_file");
      expect(aiMessage.tool_calls?.[1]?.args).toMatchObject({ path: "/a/b" });
    });
  });

  it("accepts tool messages from messages tuple streams", async () => {
    const onMessageChunk = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Looking that up...",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "tool-msg-1",
            type: "tool",
            content: '{"success":true}',
            name: "cached_search_web",
            tool_call_id: "tool-1",
            status: "success",
          },
          { run_attempt: 1 },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: {
          onMessageChunk,
        },
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ type: "human", content: "Search now" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      const toolMessage = result.current.messages[2]!;
      expect(toolMessage.type).toBe("tool");
      if (toolMessage.type !== "tool") {
        throw new Error("Expected tool message");
      }

      expect(toolMessage.id).toBe("tool-msg-1");
      expect(toolMessage.name).toBe("cached_search_web");
      expect(toolMessage.tool_call_id).toBe("tool-1");
      expect(toolMessage.status).toBe("success");
      expect(toolMessage.content).toBe('{"success":true}');
      expect(onMessageChunk).toHaveBeenCalledTimes(1);
    });
  });

  it("extracts messages from node-keyed updates shape", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "updates",
        data: {
          validate_input: {
            messages: [
              { id: "ai-1", type: "ai" as const, content: "Validated input" },
            ],
          },
        },
      },
      {
        event: "updates",
        data: {
          generate_plan: {
            messages: [
              {
                id: "ai-2",
                type: "ai" as const,
                content: "Here is your plan",
              },
            ],
          },
        },
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
        [{ id: "user-1", type: "human", content: "Plan a trip" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[0]!.id).toEqual("user-1");
      expect(result.current.messages[1]!.id).toEqual("ai-1");
      expect(result.current.messages[1]!.content).toEqual("Validated input");
      expect(result.current.messages[2]!.id).toEqual("ai-2");
      expect(result.current.messages[2]!.content).toEqual("Here is your plan");
    });
  });

  it("normalizes role-based dict messages from updates to type-based", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "updates",
        data: {
          generate_plan: {
            messages: [
              {
                id: "ai-1",
                role: "assistant",
                content: "Here is your plan",
              },
            ],
          },
        },
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
        [{ id: "user-1", type: "human", content: "Plan a trip" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.id).toEqual("ai-1");
      // role: "assistant" should be normalized to type: "ai"
      expect(aiMessage.type).toEqual("ai");
      expect(aiMessage.content).toEqual("Here is your plan");
    });
  });

  it("syncs messages from values event when no tuple events", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "hi" },
            { id: "ai-1", type: "ai" as const, content: "hello" },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]!.id).toEqual("user-1");
      expect(result.current.messages[1]!.id).toEqual("ai-1");
      expect(result.current.messages[1]!.content).toEqual("hello");
    });
  });

  it("reconciles tuple-accumulated messages with final values snapshot", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "run-1",
            content: "Streaming response",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "hi" },
            { id: "run-1", type: "ai" as const, content: "Final value" },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      // After stream ends, final values snapshot becomes authoritative
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.id).toBe("run-1");
      expect(aiMessage.content).toEqual("Final value");
    });
  });

  it("shows messages from pure node after LLM node (mixed tuple + values)", async () => {
    // Reproduces the exact issue #3598 scenario:
    // Node A (validate_input) has LLM → produces messages-tuple events
    // Node B (generate_plan) is pure Python → only produces values events
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      // Node A: LLM node produces tuple events
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Input validated.",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1, langgraph_node: "validate_input" },
        ],
      },
      // Node B: pure node, no LLM → only appears in values
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "Plan a trip" },
            { id: "ai-1", type: "ai" as const, content: "Input validated." },
            {
              id: "ai-2",
              type: "ai" as const,
              content: "Here is your plan: ...",
            },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "Plan a trip" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[2]!.id).toEqual("ai-2");
      expect(result.current.messages[2]!.content).toEqual(
        "Here is your plan: ...",
      );
    });
  });

  it("shows messages from pure node after LLM node (mixed tuple + updates)", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      // Node A: LLM node produces tuple events
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Validated.",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1, langgraph_node: "validate_input" },
        ],
      },
      // Node B: pure node → only appears in updates
      {
        event: "updates",
        data: {
          generate_plan: {
            messages: [
              {
                id: "ai-2",
                type: "ai" as const,
                content: "Here is the plan",
              },
            ],
          },
        },
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
        [{ id: "user-1", type: "human", content: "Plan" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[2]!.id).toEqual("ai-2");
      expect(result.current.messages[2]!.content).toEqual("Here is the plan");
    });
  });

  it("reconciles with final values snapshot after stream ends", async () => {
    // During streaming, tuple accumulates partial content for ai-1.
    // The final values snapshot has the complete ai-1 content.
    // After the stream ends, the final values should become authoritative.
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Partial strea",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "ming content",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      // Final values snapshot: complete state from server
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "hi" },
            {
              id: "ai-1",
              type: "ai" as const,
              content: "Partial streaming content — complete version",
            },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.id).toBe("ai-1");
      // After stream ends, should reconcile to the final values content
      expect(aiMessage.content).toEqual(
        "Partial streaming content — complete version",
      );
    });
  });

  it("does not reconcile if stream is aborted", async () => {
    const streamSpy = vi.fn().mockImplementation(async (_messages, config) => {
      async function* gen() {
        yield metadataEvent;
        yield {
          event: "messages" as const,
          data: [
            {
              id: "ai-1",
              content: "Streaming...",
              type: "AIMessageChunk",
              tool_call_chunks: [],
            },
            { run_attempt: 1 },
          ],
        };
        yield {
          event: "values" as const,
          data: {
            messages: [
              { id: "user-1", type: "human", content: "hi" },
              { id: "ai-1", type: "ai", content: "Values snapshot" },
            ],
          },
        };
        // Block until abort, then throw AbortError like the real SDK
        await new Promise<void>((_resolve, reject) => {
          const onAbort = () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          };

          if (config.abortSignal.aborted) {
            onAbort();
            return;
          }

          config.abortSignal.addEventListener("abort", onAbort, {
            once: true,
          });
        });
      }
      return gen();
    });

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy as any,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]!.content).toEqual("Streaming...");
    });

    act(() => {
      result.current.cancel();
    });

    await waitFor(() => {
      const aiMessage = result.current.messages[1]!;
      // Should keep tuple-accumulated content, NOT the values snapshot
      expect(aiMessage.content).not.toEqual("Values snapshot");
    });
  });

  it("accumulates UI messages from custom events", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Here's a chart.",
            type: "AIMessageChunk",
          },
          { run_attempt: 1 },
        ],
      },
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: { series: [1, 2, 3] },
          metadata: { message_id: "ai-1" },
        },
      },
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-2",
          name: "table",
          props: { rows: 10 },
          metadata: { message_id: "ai-1" },
        },
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
        [{ type: "human", content: "Show me a chart" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(2);
      expect(result.current.uiMessages[0]!.name).toEqual("chart");
      expect(result.current.uiMessages[1]!.name).toEqual("table");
      expect(result.current.uiMessages[0]!.metadata?.message_id).toEqual(
        "ai-1",
      );
    });
  });

  it("merges UI props when metadata.merge is true", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: { a: 1, b: 2 },
          metadata: { message_id: "ai-1" },
        },
      },
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: { b: 99, c: 3 },
          metadata: { message_id: "ai-1", merge: true },
        },
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
        [{ type: "human", content: "merge test" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      expect(result.current.uiMessages[0]!.props).toEqual({
        a: 1,
        b: 99,
        c: 3,
      });
    });
  });

  it("removes a UI message on remove-ui", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: {},
          metadata: { message_id: "ai-1" },
        },
      },
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-2",
          name: "table",
          props: {},
          metadata: { message_id: "ai-1" },
        },
      },
      {
        event: "custom",
        data: { type: "remove-ui", id: "ui-1" },
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
        [{ type: "human", content: "remove test" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      expect(result.current.uiMessages[0]!.id).toEqual("ui-2");
    });
  });

  it("extracts UI messages from the values event state snapshot", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "values",
        data: {
          messages: [
            { id: "ai-1", type: "ai" as const, content: "Here's a chart" },
          ],
          ui: [
            {
              type: "ui",
              id: "ui-1",
              name: "chart",
              props: { from: "values" },
              metadata: { message_id: "ai-1" },
            },
          ],
        },
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
        [{ type: "human", content: "values path" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      expect(result.current.uiMessages[0]!.props).toEqual({ from: "values" });
    });
  });

  it("does not route UI updates through onCustomEvent", async () => {
    const onCustomEvent = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: {},
          metadata: { message_id: "ai-1" },
        },
      },
      {
        event: "custom",
        data: { unrelated: true },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onCustomEvent },
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ type: "human", content: "filter test" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
    });

    // UI updates are swallowed; only the non-UI custom event reaches the handler
    expect(onCustomEvent).toHaveBeenCalledTimes(1);
    expect(onCustomEvent).toHaveBeenCalledWith("custom", { unrelated: true });
  });

  it("reads UI messages from a custom uiStateKey", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "values",
        data: {
          messages: [
            { id: "ai-1", type: "ai" as const, content: "Here's a chart" },
          ],
          gen_ui: [
            {
              type: "ui",
              id: "ui-1",
              name: "chart",
              props: { from: "custom-key" },
              metadata: { message_id: "ai-1" },
            },
          ],
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        uiStateKey: "gen_ui",
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ type: "human", content: "custom key" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      expect(result.current.uiMessages[0]!.props).toEqual({
        from: "custom-key",
      });
    });
  });

  it("reconciles UI state to the final values snapshot when stream ends", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      // Early values snapshot with one UI message
      {
        event: "values",
        data: {
          messages: [{ id: "ai-1", type: "ai" as const, content: "..." }],
          ui: [
            {
              type: "ui",
              id: "ui-1",
              name: "progress",
              props: { pct: 10 },
              metadata: { message_id: "ai-1" },
            },
          ],
        },
      },
      // Mid-stream custom event mutating UI
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "progress",
          props: { pct: 50 },
          metadata: { message_id: "ai-1", merge: true },
        },
      },
      // Final authoritative values snapshot
      {
        event: "values",
        data: {
          messages: [{ id: "ai-1", type: "ai" as const, content: "done" }],
          ui: [
            {
              type: "ui",
              id: "ui-1",
              name: "progress",
              props: { pct: 100 },
              metadata: { message_id: "ai-1" },
            },
          ],
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "progress" }], {});
    });

    // After the stream completes, final reconcile applies — the authoritative
    // values snapshot overwrites any intermediate custom-event mutations.
    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      expect(result.current.uiMessages[0]!.props).toEqual({ pct: 100 });
    });
  });

  it("keeps UI messages accessible when the parent AI message arrives later", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      // UI message arrives BEFORE the parent ai-1
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: { early: true },
          metadata: { message_id: "ai-1" },
        },
      },
      // Parent AI message arrives after
      {
        event: "messages",
        data: [
          { id: "ai-1", content: "chart incoming", type: "AIMessageChunk" },
          { run_attempt: 1 },
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
        [{ type: "human", content: "show chart" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      expect(result.current.uiMessages[0]!.metadata?.message_id).toEqual(
        "ai-1",
      );
      // Parent message also landed
      expect(result.current.messages.some((m) => m.id === "ai-1")).toBe(true);
    });
  });

  it("persists UI state across separate sendMessage calls", async () => {
    const firstCall = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: { turn: 1 },
          metadata: { message_id: "ai-1" },
        },
      },
    ]);

    // Mutable stream so we can swap the impl between calls
    const streamMock = vi.fn().mockImplementation(firstCall);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamMock,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "first" }], {});
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
    });

    // Second call merges into the UI state from call 1
    const secondCall = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: { turn: 2 },
          metadata: { message_id: "ai-1", merge: true },
        },
      },
    ]);
    streamMock.mockImplementation(secondCall);

    act(() => {
      result.current.sendMessage([{ type: "human", content: "second" }], {});
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
      // Merge preserves turn:1 and adds turn:2 — but since same key, turn:2 wins
      expect(result.current.uiMessages[0]!.props).toEqual({ turn: 2 });
    });
  });

  it("clears UI state when setUIMessages is called directly", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: {},
          metadata: { message_id: "ai-1" },
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "setup" }], {});
    });

    await waitFor(() => {
      expect(result.current.uiMessages).toHaveLength(1);
    });

    act(() => {
      result.current.setUIMessages([]);
    });

    expect(result.current.uiMessages).toHaveLength(0);
  });

  it("rejects malformed UI payloads without a string id", async () => {
    const onCustomEvent = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: {
          type: "ui",
          name: "chart",
          props: {},
          metadata: { message_id: "ai-1" },
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onCustomEvent },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "malformed" }], {});
    });

    await waitFor(() => {
      expect(onCustomEvent).toHaveBeenCalledTimes(1);
    });
    expect(result.current.uiMessages).toHaveLength(0);
  });

  it("accepts an array payload of UI updates on the custom channel", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "custom",
        data: [
          {
            type: "ui",
            id: "ui-1",
            name: "chart",
            props: { a: 1 },
            metadata: { message_id: "ai-1" },
          },
          {
            type: "ui",
            id: "ui-2",
            name: "table",
            props: { rows: 3 },
            metadata: { message_id: "ai-1" },
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
      result.current.sendMessage([{ type: "human", content: "batch" }], {});
    });

    await waitFor(() => {
      expect(result.current.uiMessages.map((u) => u.id)).toEqual([
        "ui-1",
        "ui-2",
      ]);
    });
  });

  it("does not intercept type:ui data on non-custom event channels", async () => {
    const onCustomEvent = vi.fn();
    // payload shaped like a UIMessage but on a different channel must forward
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "not-a-known-channel",
        data: {
          type: "ui",
          id: "ui-1",
          name: "chart",
          props: {},
          metadata: { message_id: "ai-1" },
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onCustomEvent },
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ type: "human", content: "foreign channel" }],
        {},
      );
    });

    await waitFor(() => {
      expect(onCustomEvent).toHaveBeenCalledWith(
        "not-a-known-channel",
        expect.objectContaining({ type: "ui", id: "ui-1" }),
      );
    });
    expect(result.current.uiMessages).toHaveLength(0);
  });

  it("preserves metadata through final values reconcile when tuple events present", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Hello",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          {
            langgraph_step: 1,
            langgraph_node: "agent",
            ls_model_name: "claude-3-7-sonnet-latest",
          } satisfies LangGraphTupleMetadata,
        ],
      },
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "hi" },
            { id: "ai-1", type: "ai" as const, content: "Hello world" },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]!;
      expect(aiMessage.content).toEqual("Hello world");
      const metadata = result.current.messageMetadata.get("ai-1");
      expect(metadata).toBeDefined();
      expect(metadata!.langgraph_node).toBe("agent");
      expect(metadata!.ls_model_name).toBe("claude-3-7-sonnet-latest");
    });
  });

  it("does not drop tuple-only messages during final reconcile", async () => {
    // subgraph scenario: tool result arrives via tuple after values snapshot was captured
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Let me search",
            type: "AIMessageChunk",
            tool_call_chunks: [
              { id: "tc-1", name: "search", args: '{"q":"test"}', index: 0 },
            ],
          },
          { langgraph_node: "agent" } satisfies LangGraphTupleMetadata,
        ],
      },
      // Values snapshot captured BEFORE tool result arrived
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "search test" },
            {
              id: "ai-1",
              type: "ai" as const,
              content: "Let me search",
              tool_calls: [{ id: "tc-1", name: "search", args: { q: "test" } }],
            },
          ],
        },
      },
      // Tool result arrives via tuple AFTER the values snapshot
      {
        event: "messages",
        data: [
          {
            id: "tool-1",
            type: "tool",
            content: '{"results": ["found"]}',
            tool_call_id: "tc-1",
            name: "search",
          },
          { langgraph_node: "tools" } satisfies LangGraphTupleMetadata,
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
        [{ id: "user-1", type: "human", content: "search test" }],
        {},
      );
    });

    await waitFor(() => {
      // The values snapshot only has 2 messages (user + ai), but the tool
      // result from the tuple event should NOT be dropped by reconcileMessages.
      // All 3 messages should be present: user, ai, tool.
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[2]!.id).toBe("tool-1");
      expect(result.current.messages[2]!.type).toBe("tool");
      // Metadata should still be available for ai-1
      const metadata = result.current.messageMetadata.get("ai-1");
      expect(metadata).toBeDefined();
      expect(metadata!.langgraph_node).toBe("agent");
    });
  });

  it("handles pipe-separated subgraph event names", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      // Parent AI message via tuple
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Processing",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { langgraph_node: "agent" } satisfies LangGraphTupleMetadata,
        ],
      },
      // Subgraph tuple event with pipe-separated namespace
      {
        event: "messages|tools:tc-1",
        data: [
          {
            id: "sub-ai-1",
            content: "Subgraph thinking",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          {
            langgraph_node: "sub_agent",
            langgraph_checkpoint_ns: "tools:tc-1",
          } satisfies LangGraphTupleMetadata,
        ],
      },
      // Parent values event
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "hi" },
            { id: "ai-1", type: "ai" as const, content: "Processing done" },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      // Both parent and subgraph messages should be processed
      expect(result.current.messages.length).toBeGreaterThanOrEqual(2);
      // Parent AI message should have reconciled content
      const parentAi = result.current.messages.find((m) => m.id === "ai-1");
      expect(parentAi).toBeDefined();
      expect(parentAi!.content).toEqual("Processing done");
      // Subgraph message should also be present (accumulated from tuple)
      const subAi = result.current.messages.find((m) => m.id === "sub-ai-1");
      expect(subAi).toBeDefined();
    });
  });

  it("does not mark parent message incomplete on subgraph error event", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Working on it",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { langgraph_node: "agent" } satisfies LangGraphTupleMetadata,
        ],
      },
      // Subgraph error event (pipe-separated namespace indicates subgraph)
      {
        event: "error|tools:tc-1|sub_agent",
        data: {
          error: "SubgraphError",
          message: "Subgraph failed but parent handles it",
        },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "do it" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]! as Record<string, unknown>;
      // Should NOT have incomplete status since error is from a subgraph
      expect(aiMessage.status).toBeUndefined();
    });
  });

  it("still marks parent message incomplete on root-level error event", async () => {
    const errorData = {
      error: "ServerError",
      message: "Top-level error",
    };

    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Starting",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
      // Root-level error (no pipe namespace)
      {
        event: "error",
        data: errorData,
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "go" }], {});
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      const aiMessage = result.current.messages[1]! as Record<string, unknown>;
      expect(aiMessage.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: errorData,
      });
    });
  });

  it("invokes onComplete on success path", async () => {
    const onComplete = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Done",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { run_attempt: 1 },
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
      }),
    );

    await act(async () => {
      await result.current.sendMessage(
        [{ type: "human", content: "hi" }],
        {},
        onComplete,
      );
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("invokes onComplete on abort path", async () => {
    const onComplete = vi.fn();
    const streamSpy = vi.fn().mockImplementation(async (_messages, config) => {
      async function* gen() {
        yield metadataEvent;
        await new Promise<void>((_resolve, reject) => {
          const onAbort = () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          };
          if (config.abortSignal.aborted) {
            onAbort();
            return;
          }
          config.abortSignal.addEventListener("abort", onAbort, { once: true });
        });
      }
      return gen();
    });

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: streamSpy as any,
        appendMessage: appendLangChainChunk,
      }),
    );

    act(() => {
      result.current.sendMessage(
        [{ type: "human", content: "hi" }],
        {},
        onComplete,
      );
    });

    act(() => {
      result.current.cancel();
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores subgraph values events (namespaced)", async () => {
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            content: "Parent msg",
            type: "AIMessageChunk",
            tool_call_chunks: [],
          },
          { langgraph_node: "agent" } satisfies LangGraphTupleMetadata,
        ],
      },
      // subgraph values event — must not overwrite lastValuesMessages
      {
        event: "values|tools:tc-1",
        data: {
          messages: [
            {
              id: "sub-internal",
              type: "ai" as const,
              content: "subgraph-only state",
            },
          ],
        },
      },
      // parent values event with authoritative state
      {
        event: "values",
        data: {
          messages: [
            { id: "user-1", type: "human" as const, content: "hi" },
            { id: "ai-1", type: "ai" as const, content: "Parent final" },
          ],
        },
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
        [{ id: "user-1", type: "human", content: "hi" }],
        {},
      );
    });

    await waitFor(() => {
      const parentAi = result.current.messages.find((m) => m.id === "ai-1");
      expect(parentAi).toBeDefined();
      expect(parentAi!.content).toEqual("Parent final");
      // subgraph values event did not leak into parent reconcile
      const subInternal = result.current.messages.find(
        (m) => m.id === "sub-internal",
      );
      expect(subInternal).toBeUndefined();
    });
  });

  it("ignores subgraph updates events (namespaced)", async () => {
    const onUpdates = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "updates|tools:tc-1",
        data: { some_subgraph_node: { messages: [] } },
      },
      {
        event: "updates",
        data: { agent: { messages: [] } },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onUpdates },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      // only the root-level updates event fires the handler
      expect(onUpdates).toHaveBeenCalledTimes(1);
    });
  });

  it("passes stripped event type to onCustomEvent for namespaced events", async () => {
    const onCustomEvent = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "my-channel|subgraph:xyz",
        data: { payload: 42 },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onCustomEvent },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onCustomEvent).toHaveBeenCalledWith("my-channel", { payload: 42 });
    });
  });

  it("fires onSubgraphValues with namespace for namespaced values events", async () => {
    const onValues = vi.fn();
    const onSubgraphValues = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "values|tools:tc-1",
        data: { messages: [{ id: "sub-1", type: "ai", content: "sub" }] },
      },
      {
        event: "values",
        data: { messages: [{ id: "p-1", type: "ai", content: "parent" }] },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onValues, onSubgraphValues },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onSubgraphValues).toHaveBeenCalledTimes(1);
      expect(onSubgraphValues).toHaveBeenCalledWith("tools:tc-1", {
        messages: [{ id: "sub-1", type: "ai", content: "sub" }],
      });
      expect(onValues).toHaveBeenCalledTimes(1);
      expect(onValues).toHaveBeenCalledWith({
        messages: [{ id: "p-1", type: "ai", content: "parent" }],
      });
    });
  });

  it("fires onSubgraphUpdates with namespace for namespaced updates events", async () => {
    const onUpdates = vi.fn();
    const onSubgraphUpdates = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "updates|tools:tc-1",
        data: { some_subgraph_node: { messages: [] } },
      },
      {
        event: "updates",
        data: { agent: { messages: [] } },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onUpdates, onSubgraphUpdates },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onSubgraphUpdates).toHaveBeenCalledTimes(1);
      expect(onSubgraphUpdates).toHaveBeenCalledWith("tools:tc-1", {
        some_subgraph_node: { messages: [] },
      });
      expect(onUpdates).toHaveBeenCalledTimes(1);
      expect(onUpdates).toHaveBeenCalledWith({ agent: { messages: [] } });
    });
  });

  it("routes events from multiple namespaces independently", async () => {
    const onSubgraphUpdates = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      { event: "updates|tools:tc-1", data: { node_a: { step: 1 } } },
      { event: "updates|tools:tc-2", data: { node_b: { step: 1 } } },
      { event: "updates|tools:tc-1", data: { node_a: { step: 2 } } },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onSubgraphUpdates },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onSubgraphUpdates).toHaveBeenCalledTimes(3);
    });
    expect(onSubgraphUpdates.mock.calls).toEqual([
      ["tools:tc-1", { node_a: { step: 1 } }],
      ["tools:tc-2", { node_b: { step: 1 } }],
      ["tools:tc-1", { node_a: { step: 2 } }],
    ]);
  });

  it("fires onSubgraphValues when onValues is not registered", async () => {
    const onSubgraphValues = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "values|tools:tc-1",
        data: { messages: [{ id: "s", type: "ai", content: "x" }] },
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onSubgraphValues },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onSubgraphValues).toHaveBeenCalledTimes(1);
      expect(onSubgraphValues).toHaveBeenCalledWith("tools:tc-1", {
        messages: [{ id: "s", type: "ai", content: "x" }],
      });
    });
  });

  it("fires onSubgraphError in addition to onError for namespaced errors", async () => {
    const onError = vi.fn();
    const onSubgraphError = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages",
        data: [
          {
            id: "ai-1",
            type: "AIMessageChunk",
            content: "ok",
            tool_call_chunks: [],
          },
          { langgraph_node: "agent" } satisfies LangGraphTupleMetadata,
        ],
      },
      { event: "error|tools:tc-1", data: { message: "sub boom" } },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onError, onSubgraphError },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith({ message: "sub boom" });
      expect(onSubgraphError).toHaveBeenCalledWith("tools:tc-1", {
        message: "sub boom",
      });
      // parent message is not marked incomplete for subgraph error
      const parentAi = result.current.messages.find((m) => m.id === "ai-1");
      expect(parentAi).toBeDefined();
      expect(
        (parentAi as unknown as { status?: { type: string } })?.status?.type,
      ).not.toBe("incomplete");
    });
  });

  it("merges event namespace into tupleMetadata passed to onMessageChunk", async () => {
    const onMessageChunk = vi.fn();
    const mockStreamCallback = mockStreamCallbackFactory([
      metadataEvent,
      {
        event: "messages|tools:tc-1",
        data: [
          {
            id: "sub-chunk-1",
            type: "AIMessageChunk",
            content: "hello",
            tool_call_chunks: [],
          },
          { langgraph_node: "tools" } satisfies LangGraphTupleMetadata,
        ],
      },
    ]);

    const { result } = renderHook(() =>
      useLangGraphMessages({
        stream: mockStreamCallback,
        appendMessage: appendLangChainChunk,
        eventHandlers: { onMessageChunk },
      }),
    );

    act(() => {
      result.current.sendMessage([{ type: "human", content: "hi" }], {});
    });

    await waitFor(() => {
      expect(onMessageChunk).toHaveBeenCalled();
      const [chunk, metadata] = onMessageChunk.mock.calls[0]!;
      expect(chunk).toMatchObject({ id: "sub-chunk-1", content: "hello" });
      expect(metadata).toMatchObject({
        langgraph_node: "tools",
        namespace: "tools:tc-1",
      });
      // also persisted in messageMetadata so useLangGraphMessageMetadata can see it
      expect(result.current.messageMetadata.get("sub-chunk-1")).toMatchObject({
        langgraph_node: "tools",
        namespace: "tools:tc-1",
      });
    });
  });
});
