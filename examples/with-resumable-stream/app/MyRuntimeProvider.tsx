"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  createResumableStateStorage,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useMemo, type ReactNode } from "react";

export function MyRuntimeProvider({
  children,
  onResuming,
}: {
  children: ReactNode;
  onResuming?: (isResuming: boolean) => void;
}) {
  const storage = useMemo(() => createResumableStateStorage(), []);

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat",
        resumable: {
          storage,
          resumeApi: (streamId) => `/api/chat/resume/${streamId}`,
          ...(onResuming && { onResumingChange: onResuming }),
        },
      }),
    [storage, onResuming],
  );

  const runtime = useChatRuntime({
    transport,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
