"use client";

import { type ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useDocsChatRuntime, useSpeechAdapters } from "./chat-runtime";

export function PlaygroundRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const adapters = useSpeechAdapters();
  const runtime = useDocsChatRuntime({ adapters });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
