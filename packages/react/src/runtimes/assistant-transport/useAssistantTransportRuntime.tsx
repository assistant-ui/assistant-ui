"use client";

import { ReadonlyJSONObject } from "assistant-stream/utils";
import { ThreadMessage, AppendMessage } from "../../types";
import { AttachmentAdapter } from "../adapters";
import { useExternalStoreRuntime } from "../external-store/useExternalStoreRuntime";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { AddToolResultOptions } from "../core";
import { useState, useRef } from "react";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";
import { Tool } from "assistant-stream";
import { z } from "zod";
import { JSONSchema7 } from "json-schema";
import { RunConfig } from "../../types/AssistantTypes";

type TextPart = {
  readonly type: "text";
  readonly text: string;
};

type ImagePart = {
  readonly type: "image";
  readonly image: string;
};

type UserMessagePart = TextPart | ImagePart;

export type AddMessageCommand = {
  readonly type: "add-message";
  readonly message: {
    readonly role: "user";
    readonly parts: readonly UserMessagePart[];
  };
};

export type AddToolResultCommand = {
  readonly type: "add-tool-result";
  readonly toolCallId: string;
  readonly result: ReadonlyJSONObject;
};

export type AssistantTransportCommand =
  | AddMessageCommand
  | AddToolResultCommand;

type AssistantTransportState = {
  readonly messages: readonly ThreadMessage[];
  readonly isRunning: boolean;
};

type ConnectionMetadata = {
  isSending: boolean;
};

type AssistantTransportStateConverter<T> = (
  state: T,
  connectionMetadata: ConnectionMetadata,
) => AssistantTransportState;

type HeadersValue = Record<string, string> | Headers;
type AssistantTransportOptions<T> = {
  api: string;
  converter: AssistantTransportStateConverter<T>;
  headers: HeadersValue | (() => Promise<HeadersValue>);
  body?: object;
  onResponse?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  adapters?: {
    attachments?: AttachmentAdapter | undefined;
  };
};

const toAISDKTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: (tool.parameters instanceof z.ZodType
          ? z.toJSONSchema(tool.parameters)
          : tool.parameters) as JSONSchema7,
      },
    ]),
  );
};

const getEnabledTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([, tool]) => !tool.disabled && tool.type !== "backend",
    ),
  );
};

export const useAssistantTransportRuntime = <T,>(
  options: AssistantTransportOptions<T>,
): AssistantRuntime => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AssistantTransportState>({
    messages: [],
    isRunning: false,
  });

  const sendCommand = async (
    command: AssistantTransportCommand,
    runConfig: RunConfig | undefined,
  ) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const headersValue =
        typeof options.headers === "function"
          ? await options.headers()
          : options.headers;

      const headers = new Headers(headersValue);
      headers.set("Content-Type", "application/json");

      const context = runtime.thread.getModelContext();
      const response = await fetch(options.api, {
        method: "POST",
        headers,
        body: JSON.stringify({
          commands: [command],
          system: context.system,
          tools: context.tools
            ? toAISDKTools(getEnabledTools(context.tools))
            : undefined,
          ...context.callSettings,
          ...context.config,
          ...(runConfig ? { runConfig } : {}),
          ...options.body,
        }),
        signal: abortControllerRef.current.signal,
      });

      options.onResponse?.();

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Process the assistant-stream response
      const stream = response.body
        .pipeThrough(new DataStreamDecoder())
        .pipeThrough(new AssistantMessageAccumulator());

      let agentState;
      for await (const chunk of asAsyncIterableStream(stream)) {
        agentState = chunk.metadata.unstable_state;
        const threadState = options.converter(agentState as T, {
          isSending: true,
        });
        setState(threadState);
      }

      if (agentState) {
        const threadState = options.converter(agentState as T, {
          isSending: false,
        });
        setState(threadState);

        // TODO frontend tool calls
        // Steps to implement:
        // 1. Compare threadState.messages with previous state to find new tool calls
        // 2. For each message, check parts for tool-call type without results
        // 3. Get the tool from context.tools[toolName]
        // 4. Execute tool.execute(args) if available
        // 5. Send result back via sendCommand with AddToolResultCommand
        // 6. Handle errors by sending error result
        // 7. Track which tool calls have been executed to avoid duplicates
      }

      options.onFinish?.();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        options.onCancel?.();
      } else {
        options.onError?.(error as Error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const runtime = useExternalStoreRuntime({
    isRunning: state.isRunning,
    messages: state.messages,
    adapters: options.adapters,
    onNew: async (message: AppendMessage): Promise<void> => {
      // Convert AppendMessage to AddMessageCommand
      const parts: UserMessagePart[] = [];

      for (const content of message.content) {
        if (content.type === "text") {
          parts.push({ type: "text", text: content.text });
        } else if (content.type === "image") {
          parts.push({ type: "image", image: content.image });
        }
      }

      const command: AddMessageCommand = {
        type: "add-message",
        message: {
          role: "user",
          parts,
        },
      };

      await sendCommand(command, message.runConfig);
    },
    onCancel: async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    onAddToolResult: async (
      toolOptions: AddToolResultOptions,
    ): Promise<void> => {
      const command: AddToolResultCommand = {
        type: "add-tool-result",
        toolCallId: toolOptions.toolCallId,
        result: toolOptions.result as ReadonlyJSONObject,
      };

      await sendCommand(command, undefined);
    },
  });

  return runtime;
};
