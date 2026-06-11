"use client";

import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
} from "@assistant-ui/react";
import { createPiHttpClient, usePiRuntime } from "@assistant-ui/react-pi";
import { useMemo, type ReactNode } from "react";

/**
 * Wires the browser `PiClient` (HTTP/SSE over `/api/pi`) into a Pi runtime. The
 * client is stable for the app's lifetime; `workspacePath` scopes the thread
 * list and seeds new sessions. Image attachments ride along as Pi
 * `ImageContent` (the adapter's data URLs pass through `buildPiSendInput`).
 */
export function PiRuntimeProvider({
  workspacePath,
  children,
}: {
  workspacePath?: string | undefined;
  children: ReactNode;
}) {
  const client = useMemo(() => createPiHttpClient(), []);
  const adapters = useMemo(
    () => ({ attachments: new SimpleImageAttachmentAdapter() }),
    [],
  );
  const runtime = usePiRuntime({
    client,
    adapters,
    ...(workspacePath ? { workspacePath } : {}),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
