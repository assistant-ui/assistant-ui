import { Gantt } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "A release plan from April to July, today marked",
    setup:
      "A project lead keeps one chart above the standup notes: the release plan as bars against the calendar, with a dotted line for today. It exists to make schedule slips visible before they become surprises.",
    read: "Frontend is mid-flight at the today line and beta deliberately overlaps it — that overlap is the plan, not a mistake. Launch sits alone in July with no slack behind it; if frontend slips a week, the chart already shows which bar absorbs the hit.",
    chart: (
      <Gantt
        title="Release plan"
        rows={[
          { label: "design", from: 0, to: 26, state: "done" },
          { label: "api", from: 20, to: 48, state: "done" },
          { label: "frontend", from: 40, to: 78, state: "active" },
          { label: "qa", from: 8, to: 34, state: "done" },
          { label: "beta", from: 32, to: 62, state: "planned" },
          { label: "launch", from: 74, to: 90, state: "planned" },
        ]}
        today={52}
        labels={["Apr", "May", "Jun", "Jul"]}
      />
    ),
  },
  {
    title: "A kitchen renovation, eight weeks",
    setup:
      "A contractor sketches the renovation as bars so the homeowners can see why the kitchen is unusable for exactly five of the eight weeks, and which trades depend on which.",
    read: "Plumbing and electrical share week three, which is exactly where renovations slip — two trades, one wall. Cabinets cannot start until plumbing ends, and the today line shows plumbing running two days long already.",
    chart: (
      <Gantt
        title="Kitchen renovation"
        rows={[
          { label: "demolition", from: 0, to: 12, state: "done" },
          { label: "electrical", from: 10, to: 30, state: "done" },
          { label: "plumbing", from: 14, to: 34, state: "active" },
          { label: "cabinets", from: 34, to: 60, state: "planned" },
          { label: "counters", from: 56, to: 74, state: "planned" },
          { label: "paint", from: 72, to: 90, state: "planned" },
        ]}
        today={28}
        labels={["w1", "w3", "w5", "w7"]}
      />
    ),
  },
  {
    title: "Conference day, nine to nine",
    setup:
      "An events team runs the day off one chart taped backstage: every block from check-in to the party, with the today line crawling rightward as the day burns down.",
    read: "The two track blocks straddle lunch on purpose — attendees eat in shifts and neither room ever goes dark. The party bar starts only after teardown's gap, and at the current line the team is six minutes ahead of schedule, which backstage counts as luxury.",
    chart: (
      <Gantt
        title="Conference schedule"
        rows={[
          { label: "check-in", from: 0, to: 14, state: "done" },
          { label: "keynote", from: 14, to: 28, state: "done" },
          { label: "track a", from: 30, to: 52, state: "active" },
          { label: "track b", from: 30, to: 52, state: "active" },
          { label: "lunch", from: 42, to: 50, state: "done" },
          { label: "party", from: 78, to: 92, state: "planned" },
        ]}
        today={46}
        labels={["9", "12", "15", "18", "21"]}
      />
    ),
  },
];
