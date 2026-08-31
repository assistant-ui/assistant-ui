"use client";

import {
  MessageAttachments,
  type MessageAttachmentItem,
} from "@/components/assistant-ui/elements/message-attachment";

const ATTACHMENTS: readonly MessageAttachmentItem[] = [
  {
    id: "shot",
    name: "composer-regression.png",
    size: "412 KB",
    kind: "image",
    swatch:
      "linear-gradient(135deg, oklch(0.72 0.14 250), oklch(0.58 0.16 285))",
  },
  {
    id: "spec",
    name: "migration-0.14.pdf",
    size: "1.2 MB",
    kind: "document",
    pages: 14,
  },
  { id: "log", name: "vitest-run.log", size: "38 KB", kind: "file" },
];

export function MessageAttachmentDemo() {
  return <MessageAttachments attachments={ATTACHMENTS} />;
}
