"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import { AssistantMessageFooter } from "@/components/assistant-message-footer";
import { isLeakedInlineToolText } from "@/lib/inline-tool-leak";
import {
  ErrorPrimitive,
  getMcpAppFromToolPart,
  MessagePrimitive,
  useAuiState,
} from "@assistant-ui/react";
import type { FC } from "react";
import { useMemo } from "react";

/** Tools with registered UIs — render inline instead of ToolGroup chrome. */
const INLINE_TOOL_NAMES = new Set([
  "generate_chart",
  "show_location",
  "select_date",
  "collect_contact",
]);

/** Assistant message that renders registered tool UIs inline (no ToolGroup chrome). */
export const AssistantMessageTool: FC = () => {
  const content = useAuiState((s) => s.message.content);
  const inlineToolArgsTexts = useMemo(
    () =>
      content
        .filter(
          (part) =>
            part.type === "tool-call" && INLINE_TOOL_NAMES.has(part.toolName),
        )
        .map((part) => (part.type === "tool-call" ? part.argsText : ""))
        .filter(Boolean),
    [content],
  );

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative duration-150 [contain-intrinsic-size:auto_300px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-foreground px-2 leading-relaxed wrap-break-word"
      >
        <MessagePrimitive.GroupedParts
          groupBy={(part) => {
            if (part.type === "reasoning") {
              return ["group-chainOfThought", "group-reasoning"];
            }
            if (part.type === "tool-call") {
              if (getMcpAppFromToolPart(part)) return null;
              if (INLINE_TOOL_NAMES.has(part.toolName)) return null;
              return ["group-chainOfThought", "group-tool"];
            }
            return null;
          }}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-reasoning": {
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot defaultOpen={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "group-tool":
                return (
                  <ToolGroupRoot>
                    <ToolGroupTrigger
                      count={part.indices.length}
                      active={part.status.type === "running"}
                    />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "text":
                if (isLeakedInlineToolText(part.text, inlineToolArgsTexts)) {
                  return null;
                }
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                return part.toolUI ?? <ToolFallback {...part} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
            <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>

      <AssistantMessageFooter />
    </MessagePrimitive.Root>
  );
};
