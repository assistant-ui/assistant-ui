import { Gantt } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "A release plan from April to July, today marked",
    note: "Frontend is mid-flight at the today line; beta overlaps it by design.",
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
    note: "Plumbing and electrical share week three, which is exactly where renovations slip.",
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
    note: "Two track blocks straddle lunch; the party only starts once teardown is done.",
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
