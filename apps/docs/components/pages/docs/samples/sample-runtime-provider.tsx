"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useAui,
  useLocalRuntime,
  type ChatModelAdapter,
  type CreateAttachment,
  type LocalRuntimeOptions,
  type ThreadMessageLike,
} from "@assistant-ui/react";

const noOpAdapter: ChatModelAdapter = {
  async *run() {
    yield { content: [{ type: "text", text: "This is a demo." }] };
  },
};

const defaultMessages: ThreadMessageLike[] = [
  { role: "user", content: "What is assistant-ui?" },
  {
    role: "assistant",
    content:
      "assistant-ui is a set of React components for building AI chat interfaces. It provides unstyled primitives that handle state management, streaming, and accessibility; you bring the design.",
  },
];

function useSeedAttachments(attachments: CreateAttachment[]) {
  const aui = useAui();
  const initialAttachments = useRef(attachments).current;
  useEffect(() => {
    for (const attachment of initialAttachments) {
      aui.composer.addAttachment(attachment).catch(console.error);
    }
    return () => {
      aui.composer.clearAttachments().catch(console.error);
    };
  }, [aui, initialAttachments]);
}

function SeedAttachments({ attachments }: { attachments: CreateAttachment[] }) {
  useSeedAttachments(attachments);
  return null;
}

export function SampleRuntimeProvider({
  messages = defaultMessages,
  adapters,
  initialAttachments,
  children,
}: {
  messages?: ThreadMessageLike[];
  adapters?: LocalRuntimeOptions["adapters"];
  initialAttachments?: CreateAttachment[];
  children: ReactNode;
}) {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: messages,
    adapters,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {initialAttachments && (
        <SeedAttachments attachments={initialAttachments} />
      )}
      {children}
    </AssistantRuntimeProvider>
  );
}
