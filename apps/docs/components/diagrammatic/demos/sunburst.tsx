import { Sunburst } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Budget by department, then team",
    note: "The inner ring is the org chart; the outer ring is where the money lands.",
    chart: (
      <Sunburst
        title="Budget by department, then team"
        root={{
          label: "budget",
          children: [
            {
              label: "eng",
              children: [
                { label: "platform", value: 26 },
                { label: "product", value: 19 },
              ],
            },
            {
              label: "gtm",
              children: [
                { label: "sales", value: 18 },
                { label: "marketing", value: 15 },
              ],
            },
            {
              label: "ops",
              children: [
                { label: "people", value: 13 },
                { label: "finance", value: 9 },
              ],
            },
          ],
        }}
      />
    ),
  },
  {
    title: "Sessions by device, then browser",
    note: "Safari's outer arc is almost all of mobile's inner one; that is the App Store at work.",
    chart: (
      <Sunburst
        title="Sessions by device and browser"
        root={{
          label: "sessions",
          children: [
            {
              label: "mobile",
              children: [
                { label: "safari", value: 34 },
                { label: "chrome", value: 22 },
              ],
            },
            {
              label: "desktop",
              children: [
                { label: "chrome", value: 26 },
                { label: "edge", value: 8 },
              ],
            },
            { label: "tablet", value: 10 },
          ],
        }}
      />
    ),
  },
  {
    title: "A portfolio by asset class, then holding",
    note: "Rebalancing is reading this ring: equities have grown past their target arc.",
    chart: (
      <Sunburst
        title="Portfolio by class and holding"
        root={{
          label: "portfolio",
          children: [
            {
              label: "equity",
              children: [
                { label: "us index", value: 38 },
                { label: "intl", value: 17 },
              ],
            },
            {
              label: "bonds",
              children: [
                { label: "treasury", value: 18 },
                { label: "corp", value: 9 },
              ],
            },
            {
              label: "alt",
              children: [
                { label: "reit", value: 10 },
                { label: "gold", value: 8 },
              ],
            },
          ],
        }}
      />
    ),
  },
];
