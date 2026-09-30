import { ThinkingIndicator } from "@assistant-ui/ui/components/assistant-ui/elements/thinking-indicator.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "thinking-indicator",
    title: "Thinking indicator",
    category: "chat",
    notes: "thinking-indicator.tsx: a plain label, then one with elapsed time.",
    render: () => (
      <div className="flex flex-col gap-3">
        <ThinkingIndicator label="Thinking" />
        <ThinkingIndicator
          label="Reading packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx"
          elapsed="4s"
        />
      </div>
    ),
  },
]);
