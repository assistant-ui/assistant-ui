import { Waterfall } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Gross to net, one quarter",
    note: "Anchored totals at both ends; the floating steps explain the difference.",
    chart: (
      <Waterfall
        title="Gross to net"
        steps={[
          { label: "gross", value: 40, total: true },
          { label: "subs", value: 18 },
          { label: "addons", value: 14 },
          { label: "refunds", value: -22 },
          { label: "services", value: 20 },
          { label: "credits", value: -10 },
          { label: "net", value: 60, total: true },
        ]}
      />
    ),
  },
  {
    title: "Cash through a quarter",
    note: "Opening cash, three months of burn, one bridge round; the closing bar is the runway.",
    chart: (
      <Waterfall
        title="Cash bridge"
        steps={[
          { label: "open", value: 84, total: true },
          { label: "revenue", value: 22 },
          { label: "payroll", value: -38 },
          { label: "infra", value: -12 },
          { label: "bridge", value: 30 },
          { label: "close", value: 86, total: true },
        ]}
      />
    ),
  },
  {
    title: "Renovation quote to final bill",
    note: "The quote survives until the walls open; each surprise is its own falling step.",
    chart: (
      <Waterfall
        title="Quote to final bill"
        steps={[
          { label: "quote", value: 42, total: true },
          { label: "wiring", value: 8 },
          { label: "plumbing", value: 6 },
          { label: "windows", value: 5 },
          { label: "diy credit", value: -4 },
          { label: "final", value: 57, total: true },
        ]}
      />
    ),
  },
];
