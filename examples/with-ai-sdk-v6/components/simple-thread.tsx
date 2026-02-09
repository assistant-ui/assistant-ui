"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import { MarkdownWithCards } from "./markdown-with-cards";

const UserMessage = () => (
  <MessagePrimitive.Root className="mb-4 text-right">
    <div className="inline-block rounded-lg bg-blue-500 px-4 py-2 text-white">
      <MessagePrimitive.Content />
    </div>
  </MessagePrimitive.Root>
);

const AssistantMessage = () => (
  <MessagePrimitive.Root className="mb-4">
    <div className="inline-block max-w-3xl rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownWithCards,
        }}
      />
    </div>
  </MessagePrimitive.Root>
);

/**
 * Simplified Thread that uses TextWithInlineElements for assistant messages.
 */
export function SimpleThread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      {/* Composer (input box) */}
      <div className="border-t p-4">
        <ComposerPrimitive.Root className="flex gap-2">
          <ComposerPrimitive.Input
            className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
          />
          <ComposerPrimitive.Send className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
            Send
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}
