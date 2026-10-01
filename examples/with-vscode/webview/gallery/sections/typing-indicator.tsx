import { TypingIndicator } from "@assistant-ui/ui/components/assistant-ui/elements/typing-indicator.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "typing-indicator",
    title: "Typing indicator",
    category: "chat",
    notes: "typing-indicator.tsx: bubble and bare variants.",
    render: () => (
      <div className="flex flex-col items-start gap-4">
        <TypingIndicator variant="bubble" />
        <TypingIndicator variant="bare" />
      </div>
    ),
  },
]);
