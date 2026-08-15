import { RadialBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Quarterly goals, fraction complete",
    note: "Three arcs, three fractions; the inner rings read slightly shorter by geometry alone.",
    chart: (
      <RadialBar
        title="Quarterly goals"
        items={[
          { label: "ship", value: 0.82 },
          { label: "quality", value: 0.58 },
          { label: "hiring", value: 0.36 },
        ]}
      />
    ),
  },
  {
    title: "Habit tracker, one month in",
    note: "Sleep holds, steps wobble, reading collapses; the arcs make the triage obvious.",
    chart: (
      <RadialBar
        title="Habit completion"
        items={[
          { label: "sleep", value: 0.9 },
          { label: "steps", value: 0.63 },
          { label: "reading", value: 0.27 },
        ]}
      />
    ),
  },
  {
    title: "Fundraiser progress by cause",
    note: "Each ring is a campaign against its own target, so the fractions are comparable.",
    chart: (
      <RadialBar
        title="Fundraiser progress"
        items={[
          { label: "library", value: 1 },
          { label: "shelter", value: 0.72 },
          { label: "trails", value: 0.44 },
        ]}
      />
    ),
  },
];
