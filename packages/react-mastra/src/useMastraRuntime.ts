"use client";

import { useMemo, useRef, useState } from "react";
import {
  getExternalStoreMessages,
  pickExternalStoreSharedOptions,
  type AppendMessage,
  type AddToolResultOptions,
  type ToolExecutionStatus,
  type ThreadMessage,
} from "@assistant-ui/core";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { v4 as uuidv4 } from "uuid";
import { appendMastraChunk } from "./appendMastraChunk";
import { convertMastraMessage } from "./convertMastraMessages";
import { mastraExtras } from "./runtimeExtras";
import type {
  MastraEvent,
  MastraContent,
  MastraMessage,
  MastraRuntimeConfig,
  MastraSendMessageConfig,
  MastraStreamCallback,
} from "./types";
import { useMastraMemory } from "./useMastraMemory";
import { useMastraMessages } from "./useMastraMessages";
import { useMastraWorkflows } from "./useMastraWorkflows";

const textDecoder = new TextDecoder();

const getMessageContent = (msg: AppendMessage): MastraMessage["content"] => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((attachment) => attachment.content) ?? []),
  ];

  const content = allContent.map((part): MastraContent => {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };
      case "reasoning":
        return { type: "reasoning", text: part.text };
      case "image":
        return { type: "image", url: part.image };
      case "file":
        return {
          type: "file",
          data: part.data,
          mimeType: part.mimeType,
          ...(part.filename != null && { filename: part.filename }),
        };
      case "data":
        return { type: "data", name: part.name, data: part.data };
      case "tool-call":
        throw new Error("Tool call appends are not supported.");
      default: {
        const _exhaustive: "source" | "audio" | "generative-ui" = part.type;
        throw new Error(`Unsupported append message part type: ${_exhaustive}`);
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text;
  }

  return content;
};

const truncateMastraMessages = (
  threadMessages: readonly ThreadMessage[],
  parentId: string | null,
): MastraMessage[] => {
  if (parentId === null) return [];
  const parentIndex = threadMessages.findIndex((m) => m.id === parentId);
  if (parentIndex === -1) return [];

  const truncated: MastraMessage[] = [];
  for (let i = 0; i <= parentIndex; i++) {
    truncated.push(
      ...getExternalStoreMessages<MastraMessage>(threadMessages[i]!),
    );
  }
  return truncated;
};

const normalizeFetchEvent = (value: unknown): MastraEvent => {
  if (typeof value === "object" && value != null) {
    const event = value as Partial<MastraEvent> & {
      type?: string;
      message?: MastraMessage;
    };
    if (event.event) return event as MastraEvent;
    if (event.type && "data" in event) {
      return {
        event: event.type,
        data: event.data,
        ...(event.id !== undefined && { id: event.id }),
        ...(event.timestamp !== undefined && { timestamp: event.timestamp }),
        ...(event.metadata !== undefined && { metadata: event.metadata }),
      };
    }
    if (event.message) {
      return {
        event: "message/partial",
        data: event.message,
      };
    }
  }

  return {
    event: "message/partial",
    data: {
      id: uuidv4(),
      type: "assistant",
      content: String(value),
      status: "running",
    } satisfies MastraMessage,
  };
};

export const createMastraFetchStream = (params: {
  api: string;
  agentId: string;
}): MastraStreamCallback => {
  return async function* stream(messages, config) {
    const response = await fetch(params.api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: config.abortSignal,
      body: JSON.stringify({
        agentId: params.agentId,
        messages,
        threadId: config.threadId,
        resourceId: config.resourceId,
        runConfig: config.runConfig,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mastra request failed: ${response.status}`);
    }

    if (!response.body) {
      const data = await response.json();
      yield normalizeFetchEvent(data);
      return;
    }

    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += textDecoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        const raw = trimmed.startsWith("data:")
          ? trimmed.slice(5).trim()
          : trimmed;
        if (raw === "[DONE]") return;
        yield normalizeFetchEvent(JSON.parse(raw));
      }
    }
  };
};

const useMastraRuntimeImpl = (config: MastraRuntimeConfig) => {
  const {
    adapters: { attachments, dictation, feedback, speech, voice } = {},
    agentId,
    api,
    eventHandlers,
    memory: memoryConfig,
    stream: configuredStream,
    unstable_allowCancellation,
    workflow: workflowConfig,
  } = config;

  const memory = useMastraMemory(memoryConfig || {});
  const workflow = useMastraWorkflows(workflowConfig || { workflowId: "" });
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  const stream = useMemo(() => {
    if (configuredStream) return configuredStream;
    if (!api) {
      return async function* missingStream() {
        throw new Error("useMastraRuntime requires either `stream` or `api`.");
      } satisfies MastraStreamCallback;
    }
    return createMastraFetchStream({ api, agentId });
  }, [agentId, api, configuredStream]);

  const {
    messages,
    isRunning,
    interrupt,
    sendMessage,
    cancel,
    replaceMessages,
  } = useMastraMessages({
    stream,
    appendMessage: appendMastraChunk,
    eventHandlers: {
      ...eventHandlers,
      onError: (error) => {
        config.onError?.(error);
        eventHandlers?.onError?.(error);
      },
    },
  });

  const effectiveIsRunning =
    isRunning ||
    Object.values(toolStatuses).some((status) => status.type === "executing");

  const threadMessages = useExternalMessageConverter({
    callback: convertMastraMessage,
    messages,
    isRunning: effectiveIsRunning,
    metadata: { toolStatuses },
  });

  const threadMessagesRef = useRef(threadMessages);
  threadMessagesRef.current = threadMessages;

  const runMessages = async (
    nextMessages: MastraMessage[],
    runConfig: MastraSendMessageConfig,
  ) => {
    const threadId =
      memoryConfig === false || memoryConfig == null
        ? undefined
        : (memory.currentThread ?? (await memory.createThread()));
    return sendMessage(nextMessages, {
      ...runConfig,
      ...(threadId && { threadId }),
      ...(memoryConfig !== false &&
        memoryConfig?.userId && { resourceId: memoryConfig.userId }),
    });
  };

  return useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(config),
    isRunning: effectiveIsRunning,
    messages: threadMessages,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    adapters: { attachments, dictation, feedback, speech, voice },
    extras: mastraExtras.provide({
      agentId,
      isStreaming: effectiveIsRunning,
      interrupt,
      ...(memoryConfig && { memory }),
      ...(workflowConfig && { workflow }),
    }),
    onNew: async (msg: AppendMessage) => {
      const userMessage: MastraMessage = {
        id: uuidv4(),
        type: "human",
        content: getMessageContent(msg),
        timestamp: new Date().toISOString(),
      };

      return runMessages([userMessage], { runConfig: msg.runConfig });
    },
    onEdit: async (msg: AppendMessage) => {
      const truncated = truncateMastraMessages(
        threadMessagesRef.current,
        msg.parentId,
      );
      replaceMessages(truncated);

      const editedMessage: MastraMessage = {
        id: uuidv4(),
        type: "human",
        content: getMessageContent(msg),
        timestamp: new Date().toISOString(),
      };

      return runMessages([editedMessage], { runConfig: msg.runConfig });
    },
    onReload: async (
      parentId: string | null,
      reloadConfig: { runConfig?: unknown },
    ) => {
      const truncated = truncateMastraMessages(
        threadMessagesRef.current,
        parentId,
      );
      replaceMessages(truncated);
      return runMessages([], { runConfig: reloadConfig.runConfig });
    },
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
    }: AddToolResultOptions) => {
      return runMessages(
        [
          {
            id: uuidv4(),
            type: "tool",
            tool_call_id: toolCallId,
            name: toolName,
            content: [
              {
                type: "tool_result",
                tool_result: {
                  tool_call_id: toolCallId,
                  name: toolName,
                  result,
                  ...(isError && { error: String(result) }),
                  status: isError ? "output-error" : "complete",
                },
              },
            ],
          },
        ],
        {},
      );
    },
    onCancel: unstable_allowCancellation ? async () => cancel() : undefined,
  });
};

export const useMastraRuntime = (config: MastraRuntimeConfig) => {
  return useMastraRuntimeImpl(config);
};

export const useMastraExtras = mastraExtras.use;
