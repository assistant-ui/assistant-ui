import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";
import { MyRuntimeProvider } from "@/components/MyRuntimeProvider";

export const Route = createFileRoute("/")({ component: App });

function ThreadWithSuggestions() {
  const aui = useAui();
  const config = AuiConfig({
    suggestions: Suggestions([
      {
        title: "Hello!",
        label: "start a conversation",
        prompt: "Hello! What can you help me with?",
      },
      {
        title: "What can you do?",
        label: "tell me your capabilities",
        prompt: "What kinds of things can you help me with?",
      },
    ]),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      <Thread />
    </AuiProvider>
  );
}

function App() {
  return (
    <MyRuntimeProvider>
      <main className="h-dvh">
        <ThreadWithSuggestions />
      </main>
    </MyRuntimeProvider>
  );
}
