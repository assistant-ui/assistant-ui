"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment.radix";
import { SampleFrame } from "../sample-frame";
import { SampleRuntimeProvider } from "../sample-runtime-provider";

const MESSAGES: ThreadMessageLike[] = [
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

export function AttachmentMessageContextSample() {
  return (
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6">
      <SampleRuntimeProvider messages={MESSAGES}>
        <ThreadPrimitive.Messages>
          {() => <AttachmentMessage />}
        </ThreadPrimitive.Messages>
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}

function AttachmentMessage() {
  return (
    <MessagePrimitive.Root className="flex w-full max-w-lg flex-col items-end gap-2 [--composer-padding:8px] [--composer-radius:1.5rem]">
      <UserMessageAttachments />
      <div className="bg-muted rounded-xl px-4 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}
