"use client";

import { useEdgeRuntime, Thread } from "@assistant-ui/react";

export const MyAssistant = () => {
  const runtime = useEdgeRuntime({
    api: "/api/chat",
  });

  return <Thread runtime={runtime} />;
};
