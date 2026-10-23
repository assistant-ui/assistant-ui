import { Gantt } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
    read: "Frontend runs from day 40 to day 78 and crosses the today line at day 52. Beta overlaps it from day 40 to day 62. Launch starts on day 74, four days before frontend ends, and overlaps marketing through day 86.",
    source: "Standup board, today is day 52.",
    chart: (
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
            "d0 to 26",
            "d4 to 22",
            "d20 to 48",
            "d8 to 34",
            "d40 to 78",
            "d44 to 58",
            "d50 to 72",
            "d32 to 62",
            "d60 to 86",
            "d74 to 90",
          ],
        }}
      >
        <Gantt
          aspect={1.9}
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
    ),
  },
];
