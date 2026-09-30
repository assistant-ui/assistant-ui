import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@assistant-ui/ui/components/assistant-ui/elements/attachment.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";
import { SCREENSHOT_IMAGE } from "./_chat-helpers";

const MESSAGES: ThreadMessageLike[] = [
  {
    role: "user",
    content: "Here is the regression and the failing run.",
    attachments: [
      {
        id: "shot",
        type: "image",
        name: "composer-regression.png",
        contentType: "image/svg+xml",
        status: { type: "complete" },
        content: [{ type: "image", image: SCREENSHOT_IMAGE }],
      },
      {
        id: "spec",
        type: "document",
        name: "migration-0.14-with-a-long-file-name.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [],
      },
      {
        id: "log",
        type: "file",
        name: "vitest-run.log",
        contentType: "text/plain",
        status: { type: "complete" },
        content: [],
      },
    ],
  },
];

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-end gap-2">
      <UserMessageAttachments />
      <div className="bg-muted rounded-2xl px-3.5 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AttachmentExample() {
  return (
    <SeededRuntime messages={MESSAGES}>
      <ThreadPrimitive.Root className="flex flex-col gap-4">
        <ThreadPrimitive.Messages>
          {() => <UserMessage />}
        </ThreadPrimitive.Messages>
        <ComposerPrimitive.Root className="bg-muted flex w-full flex-col rounded-3xl border px-1 pt-2">
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="min-h-10 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-sm outline-none"
            rows={1}
          />
          <div className="mx-1 mb-2 flex items-center">
            <ComposerAddAttachment />
          </div>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </SeededRuntime>
  );
}

export default defineSections([
  {
    id: "attachment",
    title: "Attachment",
    category: "chat",
    notes:
      "attachment.aui.tsx: an image, a document and a file on a user message, and the composer's add button. The local runtime has no attachment adapter, so the composer holds no attachments.",
    render: () => <AttachmentExample />,
  },
]);
