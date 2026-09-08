"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import { useDocsCloud, useDocsChatRuntime } from "./chat-runtime";

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

  const aui = useAui({ unstable_interactables: unstable_Interactables() });

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
