"use client";

import {
  AssistantRuntimeProvider,
  ThreadMessageLike,
  unstable_convertExternalMessages,
  INTERNAL,
} from "@assistant-ui/react";
import { useAssistantTransportRuntime } from "@assistant-ui/react";
import { ReactNode } from "react";

const { generateId } = INTERNAL;

type MyRuntimeProviderProps = {
  children: ReactNode;
};

type State = {
  messages: {
    role: "user" | "assistant";
    parts: {
      type: "text";
      text: string;
    }[];
  }[];
};

const fromThreadMessageLike = (message: ThreadMessageLike) => {
  return unstable_convertExternalMessages(
    [message],
    (m) => ({
      ...m,
      id: generateId(),
    }),
    false,
  )[0];
};

const converter = (state: State, connectionMetadata: any) => {
  return {
    messages:
      state.messages.map((m) =>
        fromThreadMessageLike({
          role: m.role,
          content: m.parts.map((p) => ({ type: "text", text: p.text })),
        }),
      ) || [],
    isRunning: connectionMetadata.isSending || false,
  };
};

export function MyRuntimeProvider({ children }: MyRuntimeProviderProps) {
  const runtime = useAssistantTransportRuntime({
    api: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/assistant",
    converter,
    headers: async () => ({
      "Test-Header": "test-value",
    }),
    body: {
      "Test-Body": "test-value",
    },
    onResponse: () => {
      console.log("Response received from server");
    },
    onFinish: () => {
      console.log("Conversation completed");
    },
    onError: (error: Error) => {
      console.error("Assistant transport error:", error);
    },
    onCancel: () => {
      console.log("Request cancelled");
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
