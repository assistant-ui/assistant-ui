"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { eveAskQuestionToolkit } from "@/components/eve-ask-question";
import { useEveAgentRuntime } from "@assistant-ui/eve";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
} from "@assistant-ui/react";

export default function Home() {
  const runtime = useEveAgentRuntime();
  const config = AuiConfig({
    tools: Tools({ toolkit: eveAskQuestionToolkit }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <div className="h-dvh">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
