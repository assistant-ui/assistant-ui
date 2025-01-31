"use client";

import { useEdgeRuntime } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
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
