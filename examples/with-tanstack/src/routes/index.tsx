import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "@/components/assistant-ui/thread";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";
import { MyRuntimeProvider } from "@/components/MyRuntimeProvider";

export const Route = createFileRoute("/")({ component: App });

function ThreadWithSuggestions() {
  const aui = useAui({
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
    <AuiProvider value={aui}>
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
