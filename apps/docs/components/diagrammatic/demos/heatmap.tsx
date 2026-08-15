import { Heatmap } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Deploys by service and hour",
    note: "Two categorical axes, one intensity; the noon column is release o'clock.",
    chart: (
      <Heatmap
        title="Deploys by service and hour"
        matrix={{
          rows: ["api", "web", "db", "jobs", "cdn"],
          cols: ["8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"],
          values: [
            [0.2, 0.4, 0.7, 0.5, 0.3, 0.2, 0.1, 0.15],
            [0.3, 0.6, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1],
            [0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.3, 0.2],
            [0.1, 0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.3],
            [0.05, 0.2, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4],
          ],
        }}
      />
    ),
  },
  {
    title: "Menu orders by dish and day",
    note: "The ramen row never cools; the salad row exists from Monday to Wednesday only.",
    chart: (
      <Heatmap
        title="Orders by dish and day"
        matrix={{
          rows: ["ramen", "katsu", "salad", "curry", "gyoza"],
          cols: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          values: [
            [0.7, 0.72, 0.75, 0.8, 0.9, 1, 0.85],
            [0.5, 0.52, 0.55, 0.6, 0.7, 0.8, 0.65],
            [0.6, 0.55, 0.45, 0.25, 0.15, 0.1, 0.1],
            [0.4, 0.42, 0.48, 0.55, 0.6, 0.68, 0.72],
            [0.3, 0.32, 0.4, 0.5, 0.75, 0.9, 0.7],
          ],
        }}
      />
    ),
  },
  {
    title: "Feature adoption by plan tier",
    note: "Reading down a column prices the feature; reading across a row grades the tier.",
    chart: (
      <Heatmap
        title="Adoption by plan tier"
        matrix={{
          rows: ["free", "starter", "pro", "team", "enterprise"],
          cols: ["editor", "share", "api", "sso", "audit", "export"],
          values: [
            [0.9, 0.4, 0.05, 0, 0, 0.1],
            [0.95, 0.6, 0.2, 0, 0, 0.3],
            [0.95, 0.75, 0.55, 0.1, 0.05, 0.5],
            [0.9, 0.85, 0.7, 0.6, 0.35, 0.65],
            [0.85, 0.8, 0.85, 0.95, 0.9, 0.8],
          ],
        }}
      />
    ),
  },
];
