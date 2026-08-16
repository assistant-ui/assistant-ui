import { Scatter } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper, Slide } from "./scenes";

const GADGETS = Array.from({ length: 26 }, (_, i) => ({
  x: 4 + i * 3 + (i % 5),
  y: 2.1 + i * 0.09 + (i % 7) * 0.05,
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
