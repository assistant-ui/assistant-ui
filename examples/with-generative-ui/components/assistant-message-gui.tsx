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
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import {
  extractOpenUILangFromText,
  isLeakedOpenUILangText,
} from "@assistant-ui/react-ai-sdk";
import {
  ErrorPrimitive,
  getMcpAppFromToolPart,
  MessagePrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";

const OpenUIGenerativeUI = ({ source }: { source: string }) => (
  <div className="openui-generative-ui my-2 w-full min-w-0">
    <MessagePrimitive.GenerativeUI library={openuiLibrary} source={source} />
  </div>
);

export const AssistantMessageGui: FC = () => (
  <MessagePrimitive.Root
    data-slot="aui_assistant-message-root"
    data-role="assistant"
    className="fade-in slide-in-from-bottom-1 animate-in relative duration-150"
  >
    <div
      data-slot="aui_assistant-message-content"
      // [contain-intrinsic-size:auto_24px] fixes issue #4104, don't change without checking for regressions
      className="text-foreground px-2 leading-relaxed wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto] [&_.openui-generative-ui]:px-0 [&_.openui-generative-ui]:leading-[initial] [&_.openui-generative-ui]:text-[initial]"
    >
      <MessagePrimitive.GroupedParts
        groupBy={(part) => {
          if (part.type === "reasoning") {
            return ["group-chainOfThought", "group-reasoning"];
          }
          if (part.type === "tool-call") {
            if (getMcpAppFromToolPart(part)) return [];
            return ["group-chainOfThought", "group-tool"];
          }
          return [];
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
            case "text": {
              const extracted = extractOpenUILangFromText(part.text);
              if (extracted) {
                return (
                  <>
                    {extracted.remainder ? (
                      <p className="mb-2 text-sm whitespace-pre-wrap">
                        {extracted.remainder}
                      </p>
                    ) : null}
                    <OpenUIGenerativeUI source={extracted.source} />
                  </>
                );
              }
              if (isLeakedOpenUILangText(part.text)) {
                if (process.env.NODE_ENV !== "production") {
                  console.warn(
                    "[generative-ui] OpenUI Lang leaked into markdown text.",
                  );
                }
                return null;
              }
              return <MarkdownText />;
            }
            case "reasoning":
              return <Reasoning {...part} />;
            case "generative-ui":
              return <OpenUIGenerativeUI source={part.source} />;
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
