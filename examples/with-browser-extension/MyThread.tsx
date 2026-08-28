import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import {
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
} from "@assistant-ui/react";

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

const config = AuiConfig({ suggestions });

export function MyThread() {
  const aui = useAui();
  return (
    <AuiProvider extends={aui} config={config}>
      <Thread />
    </AuiProvider>
  );
}
