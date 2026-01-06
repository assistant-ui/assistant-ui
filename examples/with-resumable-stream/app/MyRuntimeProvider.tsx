"use client";

import { AssistantRuntimeProvider, useAssistantApi } from "@assistant-ui/react";
import {
  unstable_useResumableRuntime,
  type ResumeState,
} from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useEffect, useRef, type ReactNode } from "react";

function extractUserText(messages: UIMessage[]): string {
  const lastUserMessage = messages[messages.length - 1];
  if (!lastUserMessage) return "";

  return (
    lastUserMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function ResumeInitializer({ resumeState }: { resumeState: ResumeState }) {
  const api = useAssistantApi();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!resumeState || triggeredRef.current) return;
    triggeredRef.current = true;

    const userText = extractUserText(resumeState.userMessages);

    api.thread().append({
      role: "user",
      content: [{ type: "text", text: userText }],
    });
  }, [resumeState, api]);

  return null;
}

export function MyRuntimeProvider({
  children,
  onResuming,
}: {
  children: ReactNode;
  onResuming?: (isResuming: boolean) => void;
}) {
  const { runtime, resumeState, isReady } = unstable_useResumableRuntime({
    api: "/api/chat",
    onResumingChange: onResuming,
  });

  if (!isReady) {
    return null;
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {resumeState && <ResumeInitializer resumeState={resumeState} />}
      {children}
    </AssistantRuntimeProvider>
  );
}
