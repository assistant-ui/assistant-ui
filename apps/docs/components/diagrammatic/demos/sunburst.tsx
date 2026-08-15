import { Sunburst } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Budget by department, then team",
    setup:
      "A finance partner presents the annual budget in two rings: departments inside, their teams outside. The inner ring is the org chart; the outer ring is where the money actually lands.",
    read: "Engineering's inner arc is the widest, and its two outer teams split it 26 to 19 — platform eats more than product, a fact the department-level number hid. Every outer arc sums exactly into its parent; the geometry audits the spreadsheet.",
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
    setup:
      "A web analytics review needs device and browser in one picture, because the two questions keep getting asked together. Device takes the inner ring, browser the outer.",
    read: "Safari's outer arc is almost all of mobile's inner one — that is the App Store's default at work — while desktop splits between Chrome and Edge. The tablet arc has no outer detail because at 10% nobody asked.",
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
    setup:
      "An annual rebalancing review starts with the portfolio drawn as rings: asset classes inside, individual holdings outside, every arc a fraction of the whole.",
    read: "Equity's arc has grown past its 50% target — the US index fund did the growing — while bonds shrank below plan. Rebalancing is literally reading this ring: sell where the arc is too wide, buy where it is too narrow.",
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
