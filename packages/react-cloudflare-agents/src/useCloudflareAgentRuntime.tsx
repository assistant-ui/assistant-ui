"use client";

import { useMemo } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type ExternalStoreAdapter,
} from "@assistant-ui/react";
import { AISDKMessageConverter } from "@assistant-ui/react-ai-sdk/internal";
import { getToolFromMessages } from "./utils/getToolFromMessages";

export type CloudflareAgentRuntimeOptions = {
  /**
   * Host URL for the Cloudflare Worker running the agent.
   * Required when running the worker separately (e.g., with wrangler dev).
   * @example "http://localhost:8787"
   */
  host?: string | undefined;
  /**
   * Optional adapters for attachments, speech, feedback, etc.
   */
  adapters?: NonNullable<ExternalStoreAdapter["adapters"]> | undefined;
};

/**
 * Hook to create an assistant-ui runtime from a Cloudflare Agent.
 *
 * @param agentName - The name of the agent to connect to
 * @param options - Optional configuration
 * @returns AssistantRuntime instance
 *
 * @example
 * ```tsx
 * const runtime = useCloudflareAgentRuntime("chat");
 *
 * return (
 *   <AssistantRuntimeProvider runtime={runtime}>
 *     <Thread />
 *   </AssistantRuntimeProvider>
 * );
 * ```
 */
export function useCloudflareAgentRuntime(
  agentName: string,
  options?: CloudflareAgentRuntimeOptions,
) {
  const agent = useAgent({
    agent: agentName,
    ...(options?.host && { host: options.host }),
  });

  const { messages, sendMessage, addToolResult, status, stop } = useAgentChat<
    unknown,
    UIMessage
  >({ agent });

  const isRunning = status === "submitted" || status === "streaming";

  const metadata = useMemo(() => ({}), []);

  const threadMessages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages,
    metadata,
  });

  return useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,

    onNew: async (message: AppendMessage) => {
      // Convert AppendMessage to UIMessage format for Cloudflare
      const text = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      await sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    },

    onAddToolResult: async ({ toolCallId, result, isError }) => {
      const toolName = getToolFromMessages(messages, toolCallId) || toolCallId;

      if (isError) {
        await addToolResult({
          state: "output-error",
          tool: toolName,
          toolCallId,
          errorText:
            typeof result === "string" ? result : JSON.stringify(result),
        });
      } else {
        await addToolResult({
          state: "output-available",
          tool: toolName,
          toolCallId,
          output: result,
        });
      }
    },

    onCancel: async () => {
      stop();
    },

    adapters: options?.adapters,
  });
}
