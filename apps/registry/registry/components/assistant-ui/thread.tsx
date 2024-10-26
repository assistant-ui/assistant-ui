"use client";

import { useEdgeRuntime, Thread } from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";

const MarkdownText = makeMarkdownText();

export const MyAssistant = () => {
  const runtime = useEdgeRuntime({
    api: "/api/chat",
  });

  return (
    <Thread
      runtime={runtime}
      assistantMessage={{ components: { Text: MarkdownText } }}
    />
  );
};
