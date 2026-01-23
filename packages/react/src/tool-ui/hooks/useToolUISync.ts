"use client";

import { useEffect, useRef } from "react";
import { useAssistantState } from "../../context";
import { ToolUIController } from "../ToolUIController";
import type { ToolUICallContext } from "@assistant-ui/tool-ui-runtime";

type ToolUIMinimalMessage = {
  readonly content: readonly any[];
};

export function useToolUISync(controller: ToolUIController) {
  const processedToolCallsRef = useRef<Set<string>>(new Set());

  const messages = useAssistantState(({ thread }) => thread.messages);

  useEffect(() => {
    const processMessages = (msgs: readonly ToolUIMinimalMessage[]) => {
      for (const message of msgs) {
        for (const content of message.content) {
          if (content.type === "tool-call") {
            const toolCallId = content.toolCallId;

            if (!processedToolCallsRef.current.has(toolCallId)) {
              const context: ToolUICallContext = {
                toolCallId,
                toolName: content.toolName,
                args: content.args ?? {},
              };

              controller.onToolCallStart(context);
              processedToolCallsRef.current.add(toolCallId);
            }

            if (content.result !== undefined) {
              controller.onToolCallResult(toolCallId, content.result);
            }

            if (content.result !== undefined || content.isError) {
              controller.onToolCallEnd(toolCallId);
            }

            // Nested tool calls (multi-agent future-safe)
            if (content.messages) {
              processMessages(
                content.messages as readonly ToolUIMinimalMessage[],
              );
            }
          }
        }
      }
    };

    processMessages(messages as readonly ToolUIMinimalMessage[]);
  }, [messages, controller]);
}
