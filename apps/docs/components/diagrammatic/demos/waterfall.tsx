import { Waterfall } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Report, Slide } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Gross to net, one quarter",
    setup:
      "The finance deck's classic: how gross became net, one floating step per driver, anchored totals at both ends so nobody loses the plot mid-bridge.",
    read: "Refunds are the story — the deepest fall on the chart, bigger than the credits and nearly canceling the add-ons. The bridge shape assigns responsibility the way a bar chart of the same numbers never quite does.",
    chart: (
      <Report
        title="Gross to net"
        chip="Q3"
        note="Bridge from gross bookings to net revenue."
      >
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
      </Report>
    ),
  },
  {
    title: "Cash through a quarter",
    setup:
      "A startup's board update walks the quarter's cash: opening balance, revenue in, payroll and infra out, the bridge round that landed mid-quarter, closing balance.",
    read: "The bridge round is the step that saves the chart from ending badly — without it, close lands at 56, not 86. Payroll's fall dwarfs every other step, which is what 'our burn is mostly people' looks like when drawn instead of said.",
    chart: (
      <Slide title="Cash through the quarter" footer="board deck">
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
      </Slide>
    ),
  },
  {
    title: "Renovation quote to final bill",
    setup:
      "A homeowner reconstructs how a $42k quote became a $57k bill, one surprise per step, because the contractor's explanation came in fragments and the bank wants one picture.",
    read: "The quote survives until the walls open: wiring, plumbing, and windows stack $19k of rises before the lone DIY credit claws back four. No single step looks outrageous — the bridge shows how reasonable-sized surprises compound into a 36% overrun.",
    chart: (
      <AppCard title="Quote to final bill" meta="$42k → $57k">
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
      </AppCard>
    ),
  },
];
