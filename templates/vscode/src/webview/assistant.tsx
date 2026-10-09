import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { vscodeFetch } from "@assistant-ui/vscode/webview";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

export const Assistant = () => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
      fetch: vscodeFetch,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-screen">
        <Thread />
      </main>
    </AssistantRuntimeProvider>
  );
};
