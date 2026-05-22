import { Thread } from "@assistant-ui/ui/components/assistant-ui/thread.tsx";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";

const suggestions = Suggestions([
  {
    title: "What can you do?",
    label: "Learn about my capabilities",
    prompt: "What can you help me with?",
  },
  {
    title: "How does this demo work?",
    label: "Peek under the hood",
    prompt: "How does this browser extension example work?",
  },
]);

export function MyThread() {
  const aui = useAui({ suggestions });
  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}
