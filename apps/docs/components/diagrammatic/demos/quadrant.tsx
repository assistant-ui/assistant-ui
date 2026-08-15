import { Quadrant } from "diagrammatic";

export function QuadrantDemo() {
  return (
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
}
