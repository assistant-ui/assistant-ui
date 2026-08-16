import { StackedBar } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <StackedBar
    title="Monthly cloud cost by service"
    groups={["Jan", "Feb", "Mar", "Apr"]}
    series={[
      { name: "compute", data: [26, 33, 22, 38] },
      { name: "storage", data: [19, 22, 15, 26] },
      { name: "egress", data: [12, 17, 10, 14] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Monthly cloud cost by service",
    setup:
      "Finance flags the cloud bill after it jumps twice in four months, and the platform lead has to explain which service did it. Four invoices, three line items each, stacked so the totals stay comparable.",
    read: "The bar tops tell the total's story: up, up, relief, worst month yet. Compute is the segment that moves the top every time; storage and egress just ride along. The March dip was a reserved-instance credit, not discipline.",
    chart: (
      <AppCard title="Cloud cost by service" meta="4 invoices">
        <StackedBar
          title="Monthly cloud cost by service"
          groups={["Jan", "Feb", "Mar", "Apr"]}
          series={[
            { name: "compute", data: [26, 33, 22, 38] },
            { name: "storage", data: [19, 22, 15, 26] },
            { name: "egress", data: [12, 17, 10, 14] },
          ]}
        />
      </AppCard>
    ),
  },
  {
    title: "The normalized variant: device mix by year",
    setup:
      "Passing `normalize` stretches every bar to 100%, so only composition remains. Five years of a storefront's traffic by device, for the meeting where someone asks whether the mobile redesign can wait another year.",
    read: "Mobile eats four points of share a year, every year, and tablet quietly halves. Absolute traffic grew the whole time, which the normalized form deliberately hides; that is the trade, and here it is the right one.",
    chart: (
      <AppCard title="Device mix" meta="share of traffic">
        <StackedBar
          normalize
          title="Device mix by year"
          groups={["'21", "'22", "'23", "'24", "'25"]}
          series={[
            { name: "mobile", data: [44, 50, 56, 61, 66] },
            { name: "desktop", data: [42, 38, 34, 31, 28] },
            { name: "tablet", data: [14, 12, 10, 8, 6] },
          ]}
        />
      </AppCard>
    ),
  },
];
