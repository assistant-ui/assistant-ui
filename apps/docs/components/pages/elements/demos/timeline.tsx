"use client";

import { Timeline, type TimelineEvent } from "@/components/elements/timeline";
import { useStoryPhases } from "@/components/demo/use-demo";

const EVENTS: readonly TimelineEvent[] = [
  {
    id: "1",
    when: "past",
    time: "09:02",
    title: "Issue filed",
    detail: "Draft survives a thread switch",
  },
  { id: "2", when: "past", time: "09:40", title: "Reproduced" },
  {
    id: "3",
    when: "now",
    time: "10:15",
    title: "Fix in review",
    detail: "Clears the slot on switch",
  },
  { id: "4", when: "future", time: "11:00", title: "Release 0.14.1" },
];

const PHASES = [600, 600, 600, 0] as const;

export function TimelineDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <Timeline
      events={EVENTS}
      visibleCount={Math.min(phase + 1, EVENTS.length)}
    />
  );
}
