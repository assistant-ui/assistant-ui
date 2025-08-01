"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AttachmentAdapter } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk-v4";
import { INTERNAL } from "@assistant-ui/react";

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
    api: "/api/chat",
    maxSteps: 4,
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
