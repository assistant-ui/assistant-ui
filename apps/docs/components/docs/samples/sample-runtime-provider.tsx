"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
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
      "assistant-ui is a set of React components for building AI chat interfaces. It provides unstyled primitives that handle state management, streaming, and accessibility — you bring the design.",
  },
];

export function SampleRuntimeProvider({
  messages = defaultMessages,
  adapters,
  children,
}: {
  messages?: ThreadMessageLike[];
  adapters?: LocalRuntimeOptions["adapters"];
  children: ReactNode;
}) {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: messages,
    adapters,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
