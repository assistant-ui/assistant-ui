"use client";

import { useEffect } from "react";
import {
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  useAui,
} from "@assistant-ui/react";
import {
  ComposerAddAttachment,
  ComposerAttachments,
} from "@/components/assistant-ui/attachment.radix";
import { SampleFrame } from "../sample-frame";
import { SampleRuntimeProvider } from "../sample-runtime-provider";

const ADAPTER = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
]);

const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="320" cy="72" r="36" fill="#fff" opacity="0.85"/><path d="M0 300 140 160 230 250 310 180 400 270v30z" fill="#fff" opacity="0.4"/></svg>',
)}`;

export function AttachmentComposerSample() {
  return (
    <SampleFrame className="bg-background flex h-auto min-h-48 items-center justify-center p-6">
      <SampleRuntimeProvider messages={[]} adapters={{ attachments: ADAPTER }}>
        <ComposerWithAttachments />
      </SampleRuntimeProvider>
    </SampleFrame>
  );
}

function ComposerWithAttachments() {
  useDemoAttachments();

  return (
    <ComposerPrimitive.Root className="border-border bg-muted flex w-full max-w-lg flex-col gap-2 rounded-3xl border p-3 [--composer-padding:8px] [--composer-radius:1.5rem]">
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

function useDemoAttachments() {
  const aui = useAui();
  useEffect(() => {
    void aui.composer.addAttachment({
      name: "meeting-notes.txt",
      contentType: "text/plain",
      content: [{ type: "text", text: "Meeting notes" }],
    });
    void aui.composer.addAttachment({
      name: "sunrise.svg",
      type: "image",
      contentType: "image/svg+xml",
      content: [{ type: "image", image: IMAGE_SRC }],
    });
    return () => void aui.composer.clearAttachments();
  }, [aui]);
}
