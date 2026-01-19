"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ErrorPrimitive, MessagePrimitive } from "@assistant-ui/react";
import type { FC } from "react";

export const SidebarUserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};

export const SidebarAssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
          }}
        />
        <SidebarMessageError />
      </div>
    </MessagePrimitive.Root>
  );
};

const SidebarMessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};
