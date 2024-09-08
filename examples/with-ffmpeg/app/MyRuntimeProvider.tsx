"use client";

import { AssistantRuntimeProvider, useEdgeRuntime } from "@assistant-ui/react";
import { AttachmentAdapter } from "@assistant-ui/react";
import { INTERNAL } from "@assistant-ui/react";

const { generateId } = INTERNAL;

const attachmentAdapter: AttachmentAdapter = {
  async add({ file }) {
    return {
      id: generateId(),
      type: "file",
      name: file.name,
      file,
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
  const runtime = useEdgeRuntime({
    api: "/api/chat",
    maxToolRoundtrips: 3,
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
