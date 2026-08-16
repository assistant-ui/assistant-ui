import { Gantt } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "A release plan from April to July, today marked",
    setup:
      "A project lead keeps one chart above the standup notes: the release plan as bars against the calendar, with a dotted line for today. It exists to make schedule slips visible before they become surprises.",
    read: "Frontend is mid-flight at the today line and beta deliberately overlaps it — that overlap is the plan, not a mistake. Launch sits alone in July with no slack behind it; if frontend slips a week, the chart already shows which bar absorbs the hit.",
    chart: (
      <AppCard title="Release plan" meta="Apr – Jul">
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
      </AppCard>
    ),
  },
];
