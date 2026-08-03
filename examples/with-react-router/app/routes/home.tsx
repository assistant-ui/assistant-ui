import { Thread } from "@/components/assistant-ui/thread";
import {
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";

export function meta() {
  return [
    { title: "assistant-ui with React Router" },
    { name: "description", content: "assistant-ui example with React Router" },
  ];
}

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
        title: "Tell me a joke",
        label: "about programming",
        prompt: "Tell me a funny programming joke.",
      },
    ]),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <main className="h-dvh">
      <ThreadWithSuggestions />
    </main>
  );
}
