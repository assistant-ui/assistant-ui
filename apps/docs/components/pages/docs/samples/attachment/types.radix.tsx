"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment.radix";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";

export function AttachmentTypesSample() {
  const imageSrc = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#6366f1"/><circle cx="320" cy="72" r="36" fill="#fde68a"/></svg>',
  )}`;

  const messages: ThreadMessageLike[] = [
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
          content: [{ type: "image", image: imageSrc }],
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

  return (
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6">
      <SampleRuntimeProvider messages={messages}>
        <ThreadPrimitive.Messages>
          {() => (
            <MessagePrimitive.Root className="flex w-full max-w-lg flex-col items-end gap-2 [--composer-padding:8px] [--composer-radius:1.5rem]">
              <UserMessageAttachments />
              <div className="bg-muted rounded-xl px-4 py-2 text-sm">
                <MessagePrimitive.Parts />
              </div>
            </MessagePrimitive.Root>
          )}
        </ThreadPrimitive.Messages>
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
