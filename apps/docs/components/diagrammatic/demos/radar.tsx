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
      "Two profiles, five axes ordered by how much they burn people: volume, night, severity, speed, weekend. Area is not a score. The shape is the staffing argument.",
    read: "Primary eats the pages and the SEV-1s. Secondary eats the nights and the weekends. Time-to-ack is the only shared corner. The hole in secondary's SEV-1 spoke is the policy working: secondaries do not own the incident.",
    source:
      "On-call load, Q2 2025. Each axis scaled to the worse rotation = 1.",
    chart: (
      <Radar
        density="figure"
        aspect={1.15}
        title="On-call load"
        axes={AXES}
        series={[
          { name: "primary", data: [1, 0.42, 1, 0.68, 0.31] },
          { name: "secondary", data: [0.46, 1, 0.18, 0.54, 1] },
        ]}
      />
    ),
  },
];
