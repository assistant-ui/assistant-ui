import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useLangGraphMessages } from "./useLangGraphMessages";
import { appendLangChainChunk } from "./appendLangChainChunk";
import {
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
});
