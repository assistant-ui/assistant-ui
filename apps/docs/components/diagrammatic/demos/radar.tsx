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
    title: "Two models across five capabilities",
    setup:
      "An eval report compares two language models across five benchmark axes, overlaid so their strengths argue in the same frame.",
    read: "The outlines disagree most on code and vision — atlas-1's corners — while nova-2 bulges toward reasoning and writing. The overlap in the middle is where benchmarks tie and marketing departments do not.",
    chart: (
      <Report
        title="Two models, five axes"
        chip="evals"
        note="Normalized benchmark scores; the outer edge is best in class."
      >
        <Radar
          title="Two models across five capabilities"
          axes={["code", "reason", "write", "vision", "speed"]}
          series={[
            { name: "atlas-1", data: [0.85, 0.7, 0.6, 0.8, 0.75] },
            { name: "nova-2", data: [0.55, 0.85, 0.75, 0.45, 0.6] },
          ]}
        />
      </Report>
    ),
  },
];
