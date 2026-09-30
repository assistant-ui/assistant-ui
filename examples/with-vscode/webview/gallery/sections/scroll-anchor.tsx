import {
  ScrollAnchor,
  type ScrollAnchorMessage,
} from "@assistant-ui/ui/components/assistant-ui/elements/scroll-anchor.tsx";
import { defineSections } from "../types";

const MESSAGES: ScrollAnchorMessage[] = [
  { role: "user", text: "Why does the thread jump while streaming?" },
  {
    role: "assistant",
    text: "The viewport pins to the bottom only while you are already there, so mid-stream layout shifts never steal your position.",
  },
  { role: "user", text: "And when I scroll up to reread something?" },
  {
    role: "assistant",
    text: "Pinning pauses. New tokens keep arriving below without moving your scroll position at all.",
  },
  { role: "user", text: "How do I get back down quickly?" },
  {
    role: "assistant",
    text: "A jump pill appears once content lands out of view. One click resumes the pinned follow.",
  },
];

export default defineSections([
  {
    id: "scroll-anchor",
    title: "Scroll anchor",
    category: "chat",
    notes:
      "scroll-anchor.tsx (standalone): appends a message every 1.3s until all six are shown.",
    render: () => <ScrollAnchor messages={MESSAGES} />,
  },
]);
