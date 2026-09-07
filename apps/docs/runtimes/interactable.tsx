"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
  Suggestions,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import { useDocsCloud, useDocsChatRuntime } from "./chat-runtime";

const INTERACTABLE_SUGGESTIONS = [
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
];

export function InteractableRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { cloud, claims } = useDocsCloud();

  const adapters = useMemo(
    () => ({ attachments: new SimpleImageAttachmentAdapter() }),
    [],
  );

  const runtime = useDocsChatRuntime({
    cloud,
    adapters,
    sendAutomatically: true,
  });

  const aui = useAui({
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions(INTERACTABLE_SUGGESTIONS),
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
