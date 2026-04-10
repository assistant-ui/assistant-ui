"use client";

import { useMemo, useRef, useState } from "react";
import type {
  AppendMessage,
  AttachmentAdapter,
  FeedbackAdapter,
  SpeechSynthesisAdapter,
} from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useExternalStoreRuntime,
  useExternalMessageConverter,
  useRemoteThreadListRuntime,
  useToolInvocations,
  type ToolExecutionStatus,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import { useStream, type UseStreamOptions } from "@langchain/react";
import type { LangChainBaseMessage } from "./types";
import { convertLangChainBaseMessage } from "./convertMessages";

const symbolLangChainRuntimeExtras = Symbol("langchain-runtime-extras");

type LangChainRuntimeExtras = {
  [symbolLangChainRuntimeExtras]: true;
  interrupt: { value?: unknown } | undefined;
  interrupts: readonly { value?: unknown }[];
  submit: (
    values: Record<string, unknown> | null | undefined,
    options?: Record<string, unknown>,
  ) => Promise<void>;
};

const asLangChainRuntimeExtras = (extras: unknown): LangChainRuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolLangChainRuntimeExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useStreamRuntime",
    );
  return extras as LangChainRuntimeExtras;
};

export type UseStreamRuntimeOptions = UseStreamOptions & {
  cloud?: AssistantCloud | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
        feedback?: FeedbackAdapter | undefined;
      }
    | undefined;
  /** The key in the LangGraph state that contains messages. Defaults to "messages". */
  messagesKey?: string | undefined;
};

const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];

  const hasNonText = allContent.some(
    (part) => part.type === "file" || part.type === "image",
  );
  const hasText = allContent.some((part) => part.type === "text");
  if (hasNonText && !hasText) {
    allContent.unshift({ type: "text", text: " " });
  }

  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };
      case "file":
        return {
          type: "file" as const,
          data: part.data,
          mime_type: part.mimeType,
          metadata: { filename: part.filename ?? "file" },
          source_type: "base64" as const,
        };
      case "tool-call":
        throw new Error("Tool call appends are not supported.");
      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "audio" | "data" =
          type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }
  return content;
};

const useStreamThreadRuntime = ({
  adapters,
  messagesKey = "messages",
  ...streamOptions
}: Omit<UseStreamRuntimeOptions, "cloud">) => {
  const externalId = useAuiState((s) => s.threadListItem.externalId) as
    | string
    | null;

  const stream = useStream({
    ...streamOptions,
    threadId: externalId,
  });

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const effectiveIsRunning = stream.isLoading || hasExecutingTools;

  const threadMessages = useExternalMessageConverter({
    callback: convertLangChainBaseMessage,
    messages: stream.messages as LangChainBaseMessage[],
    isRunning: effectiveIsRunning,
  });

  const [runtimeRef] = useState(() => ({
    get current() {
      return runtime;
    },
  }));

  const streamRef = useRef(stream);
  streamRef.current = stream;

  const toolInvocations = useToolInvocations({
    state: {
      messages: threadMessages,
      isRunning: effectiveIsRunning,
    },
    getTools: () => runtimeRef.current.thread.getModelContext().tools,
    onResult: (command) => {
      if (command.type === "add-tool-result") {
        void streamRef.current.submit(
          {
            [messagesKey]: [
              {
                type: "tool",
                name: command.toolName,
                tool_call_id: command.toolCallId,
                content: JSON.stringify(command.result),
                status: command.isError ? "error" : "success",
              },
            ],
          },
          {},
        );
      }
    },
    setToolStatuses,
  });

  const extras = useMemo(
    (): LangChainRuntimeExtras => ({
      [symbolLangChainRuntimeExtras]: true,
      interrupt: stream.interrupt,
      interrupts: stream.interrupts,
      submit: stream.submit,
    }),
    [stream.interrupt, stream.interrupts, stream.submit],
  );

  const runtime = useExternalStoreRuntime({
    isRunning: effectiveIsRunning,
    messages: threadMessages,
    adapters,
    extras,
    onNew: async (msg) => {
      await toolInvocations.abort();
      const content = getMessageContent(msg);
      await stream.submit({
        [messagesKey]: [{ type: "human", content }],
      });
    },
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      await stream.submit({
        [messagesKey]: [
          {
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
            ...(artifact !== undefined && { artifact }),
            status: isError ? "error" : "success",
          },
        ],
      });
    },
    onCancel: async () => {
      await stream.stop();
      await toolInvocations.abort();
    },
  });

  return runtime;
};

/**
 * Creates an assistant-ui runtime backed by LangChain's `useStream` hook.
 * Accepts the same options as `useStream` from `@langchain/react`, plus
 * `cloud` and `adapters`.
 *
 * @example
 * ```tsx
 * import { useStreamRuntime } from "@assistant-ui/react-langchain";
 * import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
 *
 * function App() {
 *   const runtime = useStreamRuntime({
 *     assistantId: "agent",
 *     apiUrl: "http://localhost:2024",
 *   });
 *
 *   return (
 *     <AssistantRuntimeProvider runtime={runtime}>
 *       <Thread />
 *     </AssistantRuntimeProvider>
 *   );
 * }
 * ```
 */
export const useStreamRuntime = ({
  cloud,
  ...options
}: UseStreamRuntimeOptions) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useStreamThreadRuntime(optionsRef.current);
    },
    adapter: cloudAdapter,
    allowNesting: true,
  });
};

/**
 * Read the current LangGraph interrupt state from the runtime extras.
 */
export const useLangChainInterruptState = () => {
  return useAuiState((s) => {
    const extras = s.thread.extras;
    if (!extras) return undefined;
    return asLangChainRuntimeExtras(extras).interrupt;
  });
};

/**
 * Returns a function to submit raw state updates to the LangGraph agent,
 * bypassing the normal message flow. Useful for sending interrupt resume
 * commands.
 */
export const useLangChainSubmit = () => {
  const aui = useAui();
  return (
    values: Record<string, unknown> | null | undefined,
    options?: Record<string, unknown>,
  ) => {
    const extras = aui.thread().getState().extras;
    const { submit } = asLangChainRuntimeExtras(extras);
    return submit(values, options);
  };
};
