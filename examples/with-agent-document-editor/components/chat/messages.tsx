"use client";

import {
  ErrorPrimitive,
  MessagePrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { QuoteBlock } from "@/components/assistant-ui/elements/quote.aui";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";

function UserMessage() {
  return (
    <MessagePrimitive.Root data-role="user" className="flex justify-end">
      <div className="bg-muted max-w-[85%] rounded-2xl px-3.5 py-2 text-sm wrap-break-word">
        <MessagePrimitive.Quote>
          {(quote) => <QuoteBlock {...quote} />}
        </MessagePrimitive.Quote>
        <MessagePrimitive.Parts>
          {({ part }) =>
            part.type === "text" ? (
              <p className="whitespace-pre-wrap">{part.text}</p>
            ) : null
          }
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      data-role="assistant"
      className="text-sm leading-relaxed wrap-break-word"
    >
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "tool-call") {
            return part.toolUI ?? <ToolFallback {...part} />;
          }
          if (part.type !== "text") return null;
          if (part.text === "" && part.status?.type === "running") {
            return (
              <span
                role="status"
                aria-label="Assistant is working"
                className="text-muted-foreground animate-pulse motion-reduce:animate-none"
              >
                ●
              </span>
            );
          }
          return <MarkdownText />;
        }}
      </MessagePrimitive.Parts>
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="border-destructive bg-destructive/10 text-destructive mt-2 rounded-md border px-3 py-2 text-sm dark:text-red-200">
          <ErrorPrimitive.Message className="line-clamp-3" />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

export function ChatMessage() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}
