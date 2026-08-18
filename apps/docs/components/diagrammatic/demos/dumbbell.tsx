import { Dumbbell } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Dumbbell
    title="Page load score, before and after"
    items={[
      { label: "home", from: 38, to: 84 },
      { label: "search", from: 52, to: 76 },
      { label: "checkout", from: 66, to: 58 },
      { label: "profile", from: 30, to: 54 },
      { label: "api docs", from: 44, to: 92 },
    ]}
    fromLabel="before"
    toLabel="after"
  />
);

export const examples: DemoExample[] = [
  {
    title: "LCP, before and after the image CDN",
    setup:
      "Ten pages, two moments. Pale is the week before the CDN. Dark is the week after. The bar is the work.",
    read: "Docs and home drop through the 2.5s budget. Checkout is the barbell that points the wrong way and is the only page still over the line: the PDP gallery was left off the CDN allowlist.",
    source: "CrUX p75 LCP, ms. Week of 28 Jul versus week of 11 Aug.",
    chart: (
      <FigTooltip
        labels={[
          "home",
          "search",
          "checkout",
          "profile",
          "docs",
          "pricing",
          "blog",
          "dashboard",
          "settings",
          "changelog",
        ]}
        series={{
          before: [2480, 2120, 1860, 2740, 3120, 1980, 1640, 2890, 2210, 2050],
          after: [1320, 1480, 2140, 1680, 1260, 1410, 1180, 1740, 1560, 1490],
        }}
      >
        <Dumbbell
          density="figure"
          aspect={1.25}
          title="LCP before and after CDN"
          items={[
            { label: "home", from: 2480, to: 1320 },
            { label: "search", from: 2120, to: 1480 },
            { label: "checkout", from: 1860, to: 2140 },
            { label: "profile", from: 2740, to: 1680 },
            { label: "docs", from: 3120, to: 1260 },
            { label: "pricing", from: 1980, to: 1410 },
            { label: "blog", from: 1640, to: 1180 },
            { label: "dashboard", from: 2890, to: 1740 },
            { label: "settings", from: 2210, to: 1560 },
            { label: "changelog", from: 2050, to: 1490 },
          ]}
          fromLabel="before"
          toLabel="after"
          guides={[{ at: 2500, label: "2.5s budget" }]}
        />
      </FigTooltip>
    ),
  },
];
