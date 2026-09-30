import {
  Timeline,
  type TimelineEvent,
} from "@assistant-ui/ui/components/assistant-ui/elements/timeline.tsx";
import { defineSections } from "../types";

const EVENTS: readonly TimelineEvent[] = [
  {
    id: "1",
    when: "past",
    time: "09:02",
    title: "Issue filed",
    detail: "Mermaid diagrams render unstyled in the webview",
  },
  { id: "2", when: "past", time: "09:40", title: "Reproduced" },
  {
    id: "3",
    when: "now",
    time: "10:15",
    title: "Fix in review",
    detail: "Moves the diagram styles into the stylesheet",
  },
  { id: "4", when: "future", time: "11:00", title: "Release 0.14.1" },
];

export default defineSections([
  {
    id: "timeline",
    title: "Timeline",
    category: "content",
    notes: "Past, current and future events, all revealed.",
    render: () => <Timeline events={EVENTS} visibleCount={EVENTS.length} />,
  },
]);
