import {
  MessageAttachments,
  type MessageAttachmentItem,
} from "@assistant-ui/ui/components/assistant-ui/elements/message-attachment.tsx";
import { defineSections } from "../types";

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
  {
    id: "log",
    name: "vitest-run-with-a-very-long-name.log",
    size: "38 KB",
    kind: "file",
  },
];

export default defineSections([
  {
    id: "message-attachment",
    title: "Message attachment",
    category: "chat",
    notes:
      "message-attachment.tsx (standalone): image, document and file tiles.",
    render: () => (
      <MessageAttachments attachments={ATTACHMENTS} onOpen={() => {}} />
    ),
  },
]);
