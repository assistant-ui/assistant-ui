import { Scatter } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report, Slide } from "./scenes";

const GADGETS = Array.from({ length: 26 }, (_, i) => ({
  x: 4 + i * 3 + (i % 5),
  y: 2.1 + i * 0.09 + (i % 7) * 0.05,
}));

const EARBUDS = Array.from({ length: 22 }, (_, i) => ({
  x: 49 + i * 14 + (i % 3) * 9,
  y: 4.5 + ((i * 7) % 11) * 0.42 + (i % 4) * 0.3,
}));

export const glyph = (
  <Scatter
    title="Rating against hours of use"
    points={GADGETS}
    trend
    xLabel="hours of use"
    yLabel="rating"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Rating against hours of use",
    setup:
      "A review site wonders whether its scores measure products or attachment, so it plots every gadget's rating against how long the reviewer actually used it before writing.",
    read: "The trend line climbs: familiarity breeds fondness, about a quarter point per ten hours. Either long use reveals real quality, or reviewers grow fond of what they have lived with. The scatter raises the question; it cannot settle it.",
    chart: (
      <AppCard title="Rating vs hours used" meta="26 reviews">
        <Scatter
          title="Rating against hours of use"
          points={GADGETS}
          trend
          xLabel="hours of use"
          yLabel="rating"
        />
      </AppCard>
    ),
  },
  {
    title: "Earbud price against battery life",
    setup:
      "Before spending $300 on earbuds, an engineer scrapes 22 spec sheets and plots price against claimed battery hours, expecting to see what the premium buys.",
    read: "A cloud with no slope. Paying more buys brand, codec badges, and a nicer case, but not hours; the $79 pair and the $249 pair share a battery column. The absent correlation is the finding.",
    chart: (
      <Report
        title="Price vs battery"
        chip="22 models"
        note="Claimed battery life against street price; no correlation found."
      >
        <Scatter
          title="Price against battery life"
          points={EARBUDS}
          xLabel="price ($)"
          yLabel="battery (h)"
        />
      </Report>
    ),
  },
  {
    title: "The sized variant: GDP, life expectancy, population",
    setup:
      "Give points a `size` and the scatter grows a third channel: area. The development-economics classic, one bubble per country, sized by population so the two giants cannot hide inside averages.",
    read: "Richer runs longer along a curve that flattens past $40k, and the two enormous bubbles sit mid-curve, carrying most of humanity with them. A small rich country and a giant middle-income one can share a life expectancy; the sizes say which fact matters more.",
    chart: (
      <Slide title="The development curve" footer="sized by population">
        <Scatter
          title="GDP per capita against life expectancy"
          points={[
            { x: 12, y: 71, size: 1400 },
            { x: 18, y: 74, size: 1100 },
            { x: 8, y: 68, size: 340 },
            { x: 42, y: 81, size: 330 },
            { x: 54, y: 83, size: 84 },
            { x: 38, y: 80, size: 67 },
            { x: 62, y: 84, size: 10 },
            { x: 30, y: 78, size: 210 },
            { x: 22, y: 76, size: 128 },
            { x: 48, y: 82, size: 47 },
          ]}
          xLabel="gdp per capita ($k)"
          yLabel="life expectancy"
        />
      </Slide>
    ),
  },
  {
    title: "The sized variant: apps by use, retention, revenue",
    setup:
      "A portfolio review plots every app by minutes-per-day and 30-day retention, bubbles sized by revenue, so the money and the health metrics share one picture.",
    read: "The big-revenue bubbles cluster high-right, as the pitch decks promised. But one small bubble retains better than everything above it: an app users love that nobody has monetized yet, which is either the next bet or the next shutdown.",
    chart: (
      <AppCard title="Use vs retention" meta="sized by revenue">
        <Scatter
          title="Apps by use and retention"
          points={[
            { x: 8, y: 22, size: 40 },
            { x: 14, y: 31, size: 120 },
            { x: 22, y: 38, size: 340 },
            { x: 31, y: 44, size: 520 },
            { x: 26, y: 55, size: 90 },
            { x: 44, y: 48, size: 760 },
            { x: 52, y: 58, size: 980 },
            { x: 12, y: 64, size: 36 },
            { x: 36, y: 35, size: 210 },
          ]}
          xLabel="minutes per day"
          yLabel="30-day retention %"
        />
      </AppCard>
    ),
  },
  {
    title: "Gelato sales against afternoon temperature",
    setup:
      "A gelateria owner finally checks the folk wisdom against the till: 24 summer days, each an afternoon high and a scoop count.",
    read: "The classic correlation, steep and tight: every degree is worth roughly a tray. The residuals have stories too; the point far above the line was the street festival, the one far below was the day the machine broke.",
    chart: (
      <Paper
        kicker="Summer"
        title="Every degree is a tray"
        source="Source: one gelateria's till, 24 days"
      >
        <Scatter
          title="Gelato sales by temperature"
          points={Array.from({ length: 24 }, (_, i) => ({
            x: 12 + i + (i % 4),
            y: 40 + i * 14 + (i % 5) * 18 - (i % 3) * 12,
          }))}
          trend
          xLabel="high (°c)"
          yLabel="scoops sold"
        />
      </Paper>
    ),
  },
];
