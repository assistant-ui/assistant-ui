"use client";

import React, { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";

/**
 * Minimal example: instantiate AG-UI runtime and provide to Assistant UI.
 */
export function MyRuntimeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const agentUrl =
    (process.env["NEXT_PUBLIC_AGUI_AGENT_URL"] as string | undefined) ??
    "http://localhost:8000/agent";

  const agent = useMemo(() => {
    return new HttpAgent({
      url: agentUrl,
      headers: {
        Accept: "text/event-stream",
      },
    });
  }, [agentUrl]);

  const runtime = useAgUiRuntime({
    agent,
    logger: {
      debug: (...a: any[]) => console.debug("[agui]", ...a),
      error: (...a: any[]) => console.error("[agui]", ...a),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
