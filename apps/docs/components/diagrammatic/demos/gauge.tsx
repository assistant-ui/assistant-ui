import { Gauge } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Error budget used this quarter",
    setup:
      "An SRE team's reliability page leads with one dial: how much of the quarter's error budget is already spent. One needle, one number, and a position that means something.",
    read: "68% spent with five weeks left — the arc makes 68% feel like a position, not just a percentage, which is the entire reason to use a dial. Past the two-thirds mark, feature launches start needing a reliability conversation first.",
    chart: <Gauge value={0.68} display="68%" label="error budget used" />,
  },
  {
    title: "Disk nearly full",
    setup:
      "A storage appliance's status screen keeps one gauge per volume. This one has been creeping right all month and just crossed the number that pages someone.",
    read: "The same dial reads differently past ninety — that is what gauges are for. At 92% the needle's position carries urgency no plain '92%' in a table row would; the on-call engineer sees the angle before the number.",
    chart: <Gauge value={0.92} display="92%" label="disk used" />,
  },
  {
    title: "Mortgage paid off",
    setup:
      "A mortgage app celebrates the long middle of a 30-year loan with a dial, because somewhere around year sixteen the number alone stops feeling like progress.",
    read: "Sixteen years in, the needle finally crosses the middle of the arc — a psychological event the amortization table cannot deliver. Same data, different instrument: the dial exists for moments, the table for math.",
    chart: <Gauge value={0.53} display="53%" label="mortgage paid" />,
  },
];
