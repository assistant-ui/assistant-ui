"use client";

import { useEffect, useRef } from "react";
import type { ToolUICallContext } from "@assistant-ui/tool-ui-runtime";
import { useAssistantState } from "../..";
import { ToolUIController } from "../ToolUIController";

export function useToolUISync(
  controller: ToolUIController | null,
  onInstancesChanged?: () => void,
) {
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const resultsSentRef = useRef<Set<string>>(new Set());

  const messages = useAssistantState(({ thread }) => thread.messages);

  useEffect(() => {
    if (!controller) {
      return;
    }

    if (!messages || messages.length === 0) {
      return;
    }

    let instancesChanged = false;

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      // FORMAT 1: content array with tool-call/tool-result parts
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "tool-call") {
            const { toolCallId, toolName, args } = part;
            // Start tool UI if not already started
            if (!processedToolCallsRef.current.has(toolCallId)) {
              const context: ToolUICallContext = {
                toolCallId,
                toolName,
                args: args ?? {},
              };
              controller.onToolCallStart(context);
              processedToolCallsRef.current.add(toolCallId);
              instancesChanged = true;
            }

            // Send result if available and not already sent
            if (part.result !== undefined) {
              if (!resultsSentRef.current.has(toolCallId)) {
                controller.onToolCallResult(toolCallId, part.result);
                resultsSentRef.current.add(toolCallId);
                instancesChanged = true;
              }
            }
          }

          if (part.type === "tool-result") {
            const { toolCallId, result } = part;

            if (!resultsSentRef.current.has(toolCallId)) {
              controller.onToolCallResult(toolCallId, result);
              resultsSentRef.current.add(toolCallId);
              instancesChanged = true;
            }
          }
        }
      }

      // FORMAT 2: toolInvocations array (AI SDK format)
      const toolInvocations = (message as any).toolInvocations;
      if (Array.isArray(toolInvocations)) {
        for (const inv of toolInvocations) {
          const { toolCallId, toolName, args, state, result } = inv;

          // Start tool UI when we first see this tool call
          if (!processedToolCallsRef.current.has(toolCallId)) {
            const context: ToolUICallContext = {
              toolCallId,
              toolName,
              args: args ?? {},
            };
            controller.onToolCallStart(context);
            processedToolCallsRef.current.add(toolCallId);
            instancesChanged = true;
          }

          // Provide result when available
          if (
            state === "result" &&
            result !== undefined &&
            !resultsSentRef.current.has(toolCallId)
          ) {
            controller.onToolCallResult(toolCallId, result);
            resultsSentRef.current.add(toolCallId);
            instancesChanged = true;
          }
        }
      }

      // FORMAT 3: parts array (some assistant-ui internal format)
      const parts = (message as any).parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.type === "tool-call") {
            const { toolCallId, toolName, args, result } = part;

            if (!processedToolCallsRef.current.has(toolCallId)) {
              const context: ToolUICallContext = {
                toolCallId,
                toolName,
                args: args ?? {},
              };
              controller.onToolCallStart(context);
              processedToolCallsRef.current.add(toolCallId);
              instancesChanged = true;
            }

            // Also check for result in parts array
            if (
              result !== undefined &&
              !resultsSentRef.current.has(toolCallId)
            ) {
              controller.onToolCallResult(toolCallId, result);
              resultsSentRef.current.add(toolCallId);
              instancesChanged = true;
            }
          }
        }
      }
    }

    // Cleanup: close tool calls that no longer exist in messages
    const currentToolCallIds = new Set<string>();
    for (const message of messages) {
      if (message.role !== "assistant") continue;

      // Collect from content
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "tool-call") {
            currentToolCallIds.add(part.toolCallId);
          }
        }
      }

      const invocations = (message as any).toolInvocations;
      if (Array.isArray(invocations)) {
        for (const inv of invocations) {
          currentToolCallIds.add(inv.toolCallId);
        }
      }

      const parts = (message as any).parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.type === "tool-call") {
            currentToolCallIds.add(part.toolCallId);
          }
        }
      }
    }

    for (const id of processedToolCallsRef.current) {
      if (!currentToolCallIds.has(id)) {
        controller.onToolCallEnd(id);
        processedToolCallsRef.current.delete(id);
        resultsSentRef.current.delete(id);
        instancesChanged = true;
      }
    }

    if (instancesChanged && onInstancesChanged) {
      onInstancesChanged();
    }
  }, [messages, controller, onInstancesChanged]);
}
