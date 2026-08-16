import { ConnectedScatter } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Slide } from "./scenes";

export const glyph = (
  <ConnectedScatter
    title="Inflation against unemployment"
    points={[
      { x: 3.9, y: 2.4, label: "2018" },
      { x: 3.7, y: 1.8 },
      { x: 8.1, y: 1.2 },
      { x: 5.4, y: 4.7 },
      { x: 3.6, y: 8 },
      { x: 3.5, y: 4.1 },
      { x: 3.9, y: 3.1 },
      { x: 4.1, y: 2.7, label: "2025" },
    ]}
    xLabel="unemployment %"
    yLabel="inflation %"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Inflation against unemployment, 2018 to 2025",
    setup:
      "An economics desk plots the two macro variables every central banker stares at — but instead of two time series, it threads the years through one plane. Time rides the path, not an axis.",
    read: "The loop is the whole story: out to the pandemic corner, up through the inflation spike, and back to almost exactly where 2018 stood. Seven dramatic years that netted out to a round trip — a shape no pair of line charts can draw.",
    chart: (
      <Paper
        kicker="Economy"
        title="The loop, 2018–2025"
        source="Source: bureau of labor statistics"
      >
        <ConnectedScatter
          title="Inflation against unemployment"
          points={[
            { x: 3.9, y: 2.4, label: "2018" },
            { x: 3.7, y: 1.8 },
            { x: 8.1, y: 1.2 },
            { x: 5.4, y: 4.7 },
            { x: 3.6, y: 8 },
            { x: 3.5, y: 4.1 },
            { x: 3.9, y: 3.1 },
            { x: 4.1, y: 2.7, label: "2025" },
          ]}
          xLabel="unemployment %"
          yLabel="inflation %"
        />
      </Paper>
    ),
  },
  {
    title: "A startup's burn against revenue, quarter by quarter",
    setup:
      "A CFO's board slide traces eight quarters through burn-versus-revenue space, because the journey matters more than either metric alone.",
    read: "The path bends right and then down: revenue first, discipline after. The top of the arc — peak burn at $7.8M revenue — is the quarter the board meeting got tense, and the descent since is the slide's entire argument for the next raise.",
    chart: (
      <Slide title="Burn vs revenue" footer="board deck · q8">
        <ConnectedScatter
          title="Burn against revenue"
          points={[
            { x: 0.4, y: 3.2, label: "seed" },
            { x: 1.1, y: 4.6 },
            { x: 2.4, y: 6.2 },
            { x: 4.8, y: 7.8 },
            { x: 7.4, y: 7.2 },
            { x: 10.2, y: 5.8 },
            { x: 12.8, y: 4.1 },
            { x: 15.5, y: 2.9, label: "now" },
          ]}
          xLabel="revenue ($m)"
          yLabel="burn ($m/q)"
        />
      </Slide>
    ),
  },
  {
    title: "Weekly mileage against race pace, four seasons",
    setup:
      "A runner threads four years of training logs through one plane: weekly kilometers against race pace, each point a season's average.",
    read: "More miles, faster paces — until the path walks backwards. The '25 point retraces toward the start: the injury year, undoing two seasons of progress in one segment. The doubling-back is what the connected form exists to show.",
    chart: (
      <AppCard title="Mileage vs pace" meta="4 seasons">
        <ConnectedScatter
          title="Mileage against pace"
          points={[
            { x: 28, y: 5.5, label: "'22" },
            { x: 38, y: 5.2 },
            { x: 47, y: 4.9 },
            { x: 56, y: 4.7, label: "'24" },
            { x: 31, y: 5.1 },
            { x: 44, y: 4.8, label: "'26" },
          ]}
          xLabel="km per week"
          yLabel="pace (min/km)"
        />
      </AppCard>
    ),
  },
];
