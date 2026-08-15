import { KpiTile } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Active runs, with trend",
    note: "The headline number, its delta, and eight periods of context in one tile.",
    chart: (
      <KpiTile
        label="active runs"
        value="1,284"
        delta={{ value: "12.4%", direction: "up" }}
        trend={[30, 42, 38, 52, 48, 62, 70, 84]}
      />
    ),
  },
  {
    title: "Monthly recurring revenue, slipping",
    note: "The down arrow does the talking; the sparkline shows it started two periods ago.",
    chart: (
      <KpiTile
        label="mrr"
        value="$48.2k"
        delta={{ value: "3.1%", direction: "down" }}
        trend={[52, 54, 55, 56, 54, 53, 51, 50]}
      />
    ),
  },
  {
    title: "Net promoter score, recovering",
    note: "A KPI tile is a sentence: NPS is 41, up six, and here is the shape of the comeback.",
    chart: (
      <KpiTile
        label="nps"
        value="41"
        delta={{ value: "6pts", direction: "up" }}
        trend={[38, 34, 29, 26, 30, 33, 37, 41]}
      />
    ),
  },
];
