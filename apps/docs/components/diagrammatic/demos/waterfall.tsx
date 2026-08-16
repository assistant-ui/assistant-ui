import { Waterfall } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

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
];
