"use client";

import { useEdgeRuntime } from "@assistant-ui/react";
import { Thread, makeMarkdownText } from "@assistant-ui/react-ui";

const MarkdownText = makeMarkdownText();

export function MyAssistant() {
  const runtime = useEdgeRuntime({ api: "/api/chat" });

  return (
    <Thread
      runtime={runtime}
      assistantMessage={{ components: { Text: MarkdownText } }}
    />
  );
}
