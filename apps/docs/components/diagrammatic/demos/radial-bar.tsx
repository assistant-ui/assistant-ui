import { RadialBar } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Quarterly goals, fraction complete",
    setup:
      "An OKR dashboard shows three goals as arcs, each sweeping toward its own 100%. The circle is a design choice, and an honest chart admits its cost up front.",
    read: "Ship is nearly closed, hiring barely started — the arc lengths rank the quarter's attention at a glance. Inner rings read slightly shorter than outer ones at equal fractions by geometry alone; keep the ring count low and the comparison casual.",
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
    setup:
      "A habit app closes each month with three rings — the watch-face grammar its users already speak. Sleep, steps, reading, each against its own monthly target.",
    read: "Sleep holds at 90%, steps wobble to two-thirds, reading collapses to a quarter — the arcs make the triage obvious before any number is read. Ring charts flatter near-complete arcs and shame short ones, which for a habit app is the feature.",
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
    setup:
      "A community foundation's donation page shows three campaigns as rings, each against its own target, so a $5k trail fund and a $50k library drive can share one graphic fairly.",
    read: "The library ring is closed — funded — while trails sits at 44%, and because each ring is normalized to its own goal, the comparison stays fair across very different asks. The full circle is the celebratory state the design is built around.",
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
