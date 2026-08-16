import { Quadrant } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <Quadrant
    title="Ideas by effort and impact"
    points={[
      { x: 2, y: 8 },
      { x: 3, y: 9 },
      { x: 2.6, y: 6.8 },
      { x: 7, y: 8.6 },
      { x: 8, y: 7.4 },
      { x: 7.4, y: 9.2 },
      { x: 8.6, y: 8 },
      { x: 1.8, y: 3 },
      { x: 2.8, y: 2 },
      { x: 3.4, y: 3.6 },
      { x: 6.8, y: 2.6 },
      { x: 8, y: 3.4 },
      { x: 8.8, y: 1.8 },
      { x: 4.8, y: 5.4 },
    ]}
    xLabel="effort"
    yLabel="impact"
    quadrants={["quick wins", "big bets", "fill-ins", "time sinks"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Ideas by effort and impact",
    setup:
      "A product team dumps the backlog onto the oldest prioritization tool there is: effort across, impact up, midlines drawn, corners named so the dots arrive pre-judged.",
    read: "The quick-wins corner holds three items — next sprint writes itself — while the time-sinks corner quietly collects the ideas everyone loves and no one should build. The one dot on the midline is the meeting's only real debate.",
    chart: (
      <AppCard title="Effort × impact" meta="backlog">
        <FigTooltip
          series={{
            effort: [
              2, 3, 2.6, 7, 8, 7.4, 8.6, 1.8, 2.8, 3.4, 6.8, 8, 8.8, 4.8,
            ],
            impact: [
              8, 9, 6.8, 8.6, 7.4, 9.2, 8, 3, 2, 3.6, 2.6, 3.4, 1.8, 5.4,
            ],
          }}
        >
          <Quadrant
            title="Ideas by effort and impact"
            points={[
              { x: 2, y: 8 },
              { x: 3, y: 9 },
              { x: 2.6, y: 6.8 },
              { x: 7, y: 8.6 },
              { x: 8, y: 7.4 },
              { x: 7.4, y: 9.2 },
              { x: 8.6, y: 8 },
              { x: 1.8, y: 3 },
              { x: 2.8, y: 2 },
              { x: 3.4, y: 3.6 },
              { x: 6.8, y: 2.6 },
              { x: 8, y: 3.4 },
              { x: 8.8, y: 1.8 },
              { x: 4.8, y: 5.4 },
            ]}
            xLabel="effort"
            yLabel="impact"
            quadrants={["quick wins", "big bets", "fill-ins", "time sinks"]}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
