"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useAui,
  unstable_Interactables,
  Suggestions,
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  SimpleImageAttachmentAdapter,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import { useDocsChatRuntime, useDocsCloud } from "@/runtimes/chat-runtime";

const feedbackAdapter: FeedbackAdapter = { submit: () => {} };

export function InteractableRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { cloud, claims } = useDocsCloud();

  const adapters = useMemo(
    () => ({
      speech: new WebSpeechSynthesisAdapter(),
      dictation: new WebSpeechDictationAdapter(),
      feedback: feedbackAdapter,
      attachments: new SimpleImageAttachmentAdapter(),
    }),
    [],
  );

  const runtime = useDocsChatRuntime({
    cloud,
    adapters,
    sendAutomatically: true,
  });

  const aui = useAui({
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions([
      {
        title: "Add 3 tasks",
        label: "for a grocery run",
        prompt: "Add 3 tasks for a grocery run",
      },
      {
        title: "Clear all tasks",
        label: "from the board",
        prompt: "Clear all tasks from the board",
      },
    ]),
  });

  useEffect(() => {
    if (claims === 0) return;
    void runtime.threads.reload();
  }, [claims, runtime]);

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
