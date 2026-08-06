"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment.radix";
import { SampleFrame } from "../sample-frame";
import { SampleRuntimeProvider } from "../sample-runtime-provider";

const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="320" cy="72" r="36" fill="#fff" opacity="0.85"/><path d="M0 300 140 160 230 250 310 180 400 270v30z" fill="#fff" opacity="0.4"/></svg>',
)}`;

const MESSAGES: ThreadMessageLike[] = [
  {
    role: "user",
    content: "Here are the files for review.",
    attachments: [
      {
        id: "image-1",
        type: "image",
        name: "sunrise.svg",
        contentType: "image/svg+xml",
        status: { type: "complete" },
        content: [{ type: "image", image: IMAGE_SRC }],
      },
      {
        id: "document-1",
        type: "document",
        name: "project-brief.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [],
      },
      {
        id: "workflow-1",
        type: "data-workflow",
        name: "release-workflow.json",
        contentType: "application/json",
        status: { type: "complete" },
        content: [],
      },
    ],
  },
];

export function AttachmentTypesSample() {
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
