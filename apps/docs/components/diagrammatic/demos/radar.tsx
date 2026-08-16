import { Radar } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <Radar
    title="Two models across five capabilities"
    axes={["code", "reason", "write", "vision", "speed"]}
    series={[
      { name: "atlas-1", data: [0.85, 0.7, 0.6, 0.8, 0.75] },
      { name: "nova-2", data: [0.55, 0.85, 0.75, 0.45, 0.6] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Three models across six capabilities",
    setup:
      "An eval report compares three language models across six benchmark axes, overlaid so their strengths argue in the same frame.",
    read: "The outlines disagree most on code and vision — atlas-1's corners — while nova-2 bulges toward reasoning and writing and quill trades everything for speed and cost. The overlap in the middle is where benchmarks tie and marketing departments do not.",
    chart: (
      <Report
        title="Three models, six axes"
        chip="evals"
        note="Normalized benchmark scores; the outer edge is best in class."
      >
        <Radar
          title="Three models across six capabilities"
          axes={["code", "reason", "write", "vision", "speed", "cost"]}
          series={[
            { name: "atlas-1", data: [0.85, 0.7, 0.6, 0.8, 0.55, 0.35] },
            { name: "nova-2", data: [0.55, 0.85, 0.75, 0.45, 0.6, 0.55] },
            { name: "quill", data: [0.45, 0.5, 0.55, 0.3, 0.9, 0.92] },
          ]}
        />
      </Report>
    ),
  },
];
