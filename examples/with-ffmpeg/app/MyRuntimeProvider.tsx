"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AttachmentAdapter } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { INTERNAL } from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

const { generateId } = INTERNAL;

const attachmentAdapter: AttachmentAdapter = {
  accept: "image/*,video/*,audio/*",
  async add({ file }) {
    return {
      id: generateId(),
      file,
      type: "file",
      name: file.name,
      contentType: file.type,
      status: { type: "requires-action", reason: "composer-send" },
    };
  },
  async send(attachment) {
    return {
      ...attachment,
      content: [
        {
          type: "text",
          text: `[User attached a file: ${attachment.name}]`,
        },
      ],
      status: { type: "complete" },
    };
  },
  async remove() {
    // noop
  },
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    adapters: {
      attachments: attachmentAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
