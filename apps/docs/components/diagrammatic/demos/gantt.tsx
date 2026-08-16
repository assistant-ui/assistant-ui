import { Gantt } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
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
        <FigTooltip
          labels={[
            "design",
            "infra",
            "api",
            "qa",
            "frontend",
            "security",
            "docs",
            "beta",
            "marketing",
            "launch",
          ]}
          series={{
            span: [
              "d0–26",
              "d4–22",
              "d20–48",
              "d8–34",
              "d40–78",
              "d44–58",
              "d50–72",
              "d32–62",
              "d60–86",
              "d74–90",
            ],
          }}
        >
          <Gantt
            title="Release plan"
            rows={[
              { label: "design", from: 0, to: 26, state: "done" },
              { label: "infra", from: 4, to: 22, state: "done" },
              { label: "api", from: 20, to: 48, state: "done" },
              { label: "qa", from: 8, to: 34, state: "done" },
              { label: "frontend", from: 40, to: 78, state: "active" },
              { label: "security", from: 44, to: 58, state: "active" },
              { label: "docs", from: 50, to: 72, state: "planned" },
              { label: "beta", from: 32, to: 62, state: "planned" },
              { label: "marketing", from: 60, to: 86, state: "planned" },
              { label: "launch", from: 74, to: 90, state: "planned" },
            ]}
            today={52}
            labels={["Apr", "May", "Jun", "Jul"]}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
