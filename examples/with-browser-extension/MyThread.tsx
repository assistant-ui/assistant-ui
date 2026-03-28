import { Thread } from "@assistant-ui/ui/components/assistant-ui/thread.tsx";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";

const suggestions = Suggestions([
  {
    title: "What can you do?",
    label: "Learn about my capabilities",
    prompt: "What can you help me with?",
  },
  {
    title: "Summarize this page",
    label: "Get a quick summary",
    prompt: "Can you summarize the content of this page?",
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
