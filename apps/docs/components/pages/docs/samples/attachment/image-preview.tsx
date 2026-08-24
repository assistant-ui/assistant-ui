"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";

export function AttachmentPreviewSample() {
  const imageSrc = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#6366f1"/><circle cx="320" cy="72" r="36" fill="#fde68a"/></svg>',
  )}`;

  const messages: ThreadMessageLike[] = [
    {
      role: "user",
      content: "Check out this photo!",
      attachments: [
        {
          id: "photo-1",
          type: "image",
          name: "sunrise.svg",
          contentType: "image/svg+xml",
          status: { type: "complete" },
          content: [{ type: "image", image: imageSrc }],
        },
      ],
    },
  ];

  return (
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6">
      <SampleRuntimeProvider messages={messages}>
        <div className="flex flex-col items-center gap-4">
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
          <p className="text-muted-foreground text-xs">
            Select the image to open the preview.
          </p>
        </div>
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
