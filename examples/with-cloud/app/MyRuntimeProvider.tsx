"use client";

import {
  AssistantCloud,
  AssistantRuntimeProvider,
  useCloudThreadListRuntime,
  useEdgeRuntime,
} from "@assistant-ui/react";

const useThreadRuntime = () => {
  const runtime = useEdgeRuntime({
    api: "/api/chat",
    unstable_AISDKInterop: true,
    unstable_sendMessageIds: true,
  });

  return runtime;
};

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  authToken: () =>
    fetch("/api/assistant-ui-token", { method: "POST" })
      .then((r) => r.json())
      .then((r) => r.token),
});

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useCloudThreadListRuntime({
    cloud,
    runtimeHook: useThreadRuntime,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
