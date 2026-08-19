"use client";

import { MessagePrimitive } from "@assistant-ui/react";
// Separate statement: the Code tab keeps an import whenever any one of its
// names is used, so grouping these with MessagePrimitive would show a list
// wrapper and a fixture type the extracted snippet never uses.
import { ThreadPrimitive, type ThreadMessageLike } from "@assistant-ui/react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment.radix";
import { SampleFrame } from "../sample-frame";
import { SampleRuntimeProvider } from "../sample-runtime-provider";

export function UserMessageWithAttachments() {
  return (
    <MessagePrimitive.Root className="flex w-full max-w-lg flex-col items-end gap-2">
      <UserMessageAttachments />
      <div className="bg-muted rounded-xl px-4 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
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
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6">
      <SampleRuntimeProvider messages={messages}>
        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === "user" ? <UserMessageWithAttachments /> : null
          }
        </ThreadPrimitive.Messages>
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
