import { Gauge } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <Gauge value={0.68} display="68%" label="error budget used" />
);

export const examples: DemoExample[] = [
  {
    title: "Error budget used this quarter",
    setup:
      "An SRE team's reliability page leads with one dial: how much of the quarter's error budget is already spent. One needle, one number, and a position that means something.",
    read: "68% spent with five weeks left — the arc makes 68% feel like a position, not just a percentage, which is the entire reason to use a dial. Past the two-thirds mark, feature launches start needing a reliability conversation first.",
    chart: (
      <Terminal title="error budget">
        <Gauge value={0.68} display="68%" label="error budget used" />
      </Terminal>
    ),
  },
];
