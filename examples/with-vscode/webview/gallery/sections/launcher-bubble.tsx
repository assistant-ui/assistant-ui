import { useState } from "react";
import { LauncherBubble } from "@assistant-ui/ui/components/assistant-ui/elements/launcher-bubble.tsx";
import { defineSections } from "../types";

const PROMPTS = [
  "How do I add a thread list?",
  "What changed in 0.14?",
  "Show me an external store example",
];

function LauncherBubbleExample({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <LauncherBubble
      open={open}
      unread={2}
      greeting="Need a hand with assistant-ui?"
      prompts={PROMPTS}
      onPick={() => {}}
      onStart={() => {}}
      onToggle={() => setOpen((current) => !current)}
    />
  );
}

export default defineSections([
  {
    id: "launcher-bubble",
    title: "Launcher bubble (closed)",
    category: "chat",
    notes: "launcher-bubble.tsx (standalone) with two unread.",
    render: () => <LauncherBubbleExample initialOpen={false} />,
  },
  {
    id: "launcher-bubble-open",
    title: "Launcher bubble (open)",
    category: "chat",
    notes: "Open: greeting and prompt chips.",
    render: () => <LauncherBubbleExample initialOpen />,
  },
]);
