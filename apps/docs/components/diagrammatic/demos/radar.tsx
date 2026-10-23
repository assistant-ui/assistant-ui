import { Radar } from "diagrammatic";
import type { DemoExample } from "./types";

const AXES = ["pages", "after hours", "SEV-1", "time to ack", "weekend"];

export const glyph = (
  <Radar
    title="On-call load"
    axes={AXES}
    series={[
      { name: "primary", data: [0.7, 0.4, 0.3, 0.5, 0.35] },
      { name: "secondary", data: [0.4, 0.6, 0.2, 0.35, 0.55] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Primary against secondary, one quarter",
    setup:
      "Three profiles across five axes: pages, after hours, SEV-1, time to ack, and weekend load. The third profile shows a designed target alongside the two rotations.",
    read: "Primary leads on pages, SEV-1, and time to ack. Secondary leads on after-hours and weekend load. The designed profile falls between them on four spokes; its time-to-ack value of 0.5 is below both rotations.",
    source: "On-call load, Q2 2025. Normalized axis values.",
    chart: (
      <Radar
        aspect={1.15}
        title="On-call load"
        axes={AXES}
        series={[
          { name: "primary", data: [1, 0.42, 1, 0.68, 0.31] },
          { name: "secondary", data: [0.46, 1, 0.18, 0.54, 1] },
          { name: "designed", data: [0.7, 0.55, 0.45, 0.5, 0.4] },
        ]}
      />
    ),
  },
];
