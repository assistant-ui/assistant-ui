"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { createPiHttpClient, usePiRuntime } from "@assistant-ui/react-pi";
import { useMemo, type ReactNode } from "react";

/**
 * Wires the browser `PiClient` (HTTP/SSE over `/api/pi`) into a Pi runtime. The
 * client is stable for the app's lifetime; `workspacePath` scopes the thread
 * list and seeds new sessions.
 */
export function PiRuntimeProvider({
  workspacePath,
  children,
}: {
  workspacePath?: string | undefined;
  children: ReactNode;
}) {
  const client = useMemo(() => createPiHttpClient(), []);
  const runtime = usePiRuntime({
    client,
    ...(workspacePath ? { workspacePath } : {}),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
