"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
// Separate statement: the Code tab keeps an import whenever any one of its
// names is used, so grouping these with ComposerPrimitive would show adapter
// wiring the extracted snippet never calls.
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";
import {
  ComposerAddAttachment,
  ComposerAttachments,
} from "@/components/assistant-ui/attachment";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";

export function ComposerWithAttachments() {
  return (
    <ComposerPrimitive.Root className="border-border bg-muted flex w-full max-w-lg flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding)">
      <ComposerAttachments />
      <ComposerPrimitive.Input
        aria-label="Message input"
        placeholder="Send a message..."
        className="min-h-10 resize-none bg-transparent px-2 outline-none"
      />
      <div className="flex items-center">
        <ComposerAddAttachment />
      </div>
    </ComposerPrimitive.Root>
  );
}

const imageSrc = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#6366f1"/><circle cx="320" cy="72" r="36" fill="#fde68a"/></svg>',
)}`;

export function AttachmentComposerSample() {
  return (
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6 [--composer-padding:8px] [--composer-radius:1.5rem]">
      <SampleRuntimeProvider
        messages={[]}
        adapters={{
          attachments: new CompositeAttachmentAdapter([
            new SimpleImageAttachmentAdapter(),
            new SimpleTextAttachmentAdapter(),
          ]),
        }}
        initialAttachments={[
          {
            name: "meeting-notes.txt",
            contentType: "text/plain",
            content: [{ type: "text", text: "Meeting notes" }],
          },
          {
            name: "sunrise.svg",
            type: "image",
            contentType: "image/svg+xml",
            content: [{ type: "image", image: imageSrc }],
          },
        ]}
      >
        <ComposerWithAttachments />
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}
