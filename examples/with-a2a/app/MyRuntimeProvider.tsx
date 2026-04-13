"use client";

import type { ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useA2ARuntime } from "@assistant-ui/react-a2a";

export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const serverUrl =
    (process.env.NEXT_PUBLIC_A2A_SERVER_URL as string | undefined) ??
    "http://localhost:9999";

  const runtime = useA2ARuntime({
    baseUrl: serverUrl,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
