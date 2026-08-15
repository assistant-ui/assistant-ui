import { Gauge } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Error budget used this quarter",
    note: "One needle, one number; the arc exists to make 68% feel like a position.",
    chart: <Gauge value={0.68} display="68%" label="error budget used" />,
  },
  {
    title: "Disk nearly full",
    note: "The same dial reads differently past ninety; that is what gauges are for.",
    chart: <Gauge value={0.92} display="92%" label="disk used" />,
  },
  {
    title: "Mortgage paid off",
    note: "Sixteen years in, the needle finally crosses the middle of the arc.",
    chart: <Gauge value={0.53} display="53%" label="mortgage paid" />,
  },
];
