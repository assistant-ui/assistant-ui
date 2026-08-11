"use client";

import { MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
// Separate statement: the Code tab keeps an import whenever any one of its
// names is used, so grouping this with the primitives would show a fixture type
// the extracted snippet never uses.
import type { ThreadMessageLike } from "@assistant-ui/react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment.radix";
import { SampleFrame } from "../sample-frame";
import { SampleRuntimeProvider } from "../sample-runtime-provider";

export function UserMessageWithAttachments() {
  return (
    <ThreadPrimitive.Messages>
      {() => (
        <MessagePrimitive.Root className="flex w-full max-w-lg flex-col items-end gap-2">
          <UserMessageAttachments />
          <div className="bg-muted rounded-xl px-4 py-2 text-sm">
            <MessagePrimitive.Parts />
          </div>
        </MessagePrimitive.Root>
      )}
    </ThreadPrimitive.Messages>
  );
}

export function AttachmentMessageContextSample() {
  const messages: ThreadMessageLike[] = [
    {
      role: "user",
      content: "Attached is the quarterly report.",
      attachments: [
        {
          id: "report-1",
          type: "document",
          name: "quarterly-report.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [],
        },
      ],
    },
  ];

  return (
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6 [--composer-padding:8px] [--composer-radius:1.5rem]">
      <SampleRuntimeProvider messages={messages}>
        <UserMessageWithAttachments />
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
