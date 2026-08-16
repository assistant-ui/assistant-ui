import { Bar } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const TEAMS = [
  { label: "payments", value: 4.2 },
  { label: "checkout", value: 6.1 },
  { label: "search", value: 7.4 },
  { label: "growth", value: 9.8 },
  { label: "data", value: 11.2 },
  { label: "mobile", value: 13.6 },
  { label: "infra", value: 16.4 },
  { label: "platform", value: 18.9 },
  { label: "ads", value: 24.5 },
  { label: "legacy", value: 41.0 },
];

export const glyph = (
  <Bar
    title="Median time to ack"
    items={TEAMS.slice(0, 6).map((row) => ({
      label: row.label,
      value: row.value,
    }))}
    format={(v) => `${v}m`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Median time to ack, last 90 days",
    setup:
      "The on-call review ranks every rotation by how long a page sat before a human answered. Horizontal bars, longest names, a dashed SLO at 15 minutes.",
    read: "Payments answers in 4.2 minutes. Legacy is 41, almost three SLOs late, and ads has already slipped the line. The six teams under 15 minutes are not the meeting; the four past the dash are.",
    source: "PagerDuty ack timestamps, last 90 days. n = 1,184 pages.",
    chart: (
      <FigTooltip
        labels={TEAMS.map((row) => row.label)}
        series={{ "median ack, min": TEAMS.map((row) => row.value) }}
      >
        <Bar
          density="figure"
          aspect={1.2}
          title="Median minutes to ack"
          items={TEAMS}
          xTicks={[
            { at: 0, label: "0" },
            { at: 15, label: "15" },
            { at: 30, label: "30" },
            { at: 45, label: "45" },
          ]}
          target={{ at: 15, label: "SLO 15m" }}
          format={(v) => `${v}`}
        />
      </FigTooltip>
    ),
  },
];
