import { Quadrant } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Ideas by effort and impact",
    note: "The corners are named so the dots come pre-judged; quick wins live top-left.",
    chart: (
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
    ),
  },
  {
    title: "Restaurants by price and rating",
    note: "Cheap gems top-left, tourist traps bottom-right; the diagonal is what you pay for.",
    chart: (
      <Quadrant
        title="Restaurants by price and rating"
        points={[
          { x: 1.6, y: 8.8 },
          { x: 2.4, y: 8.2 },
          { x: 3, y: 7.4 },
          { x: 2, y: 6.4 },
          { x: 7.2, y: 9 },
          { x: 8.4, y: 8.2 },
          { x: 6.6, y: 7 },
          { x: 2.6, y: 3.2 },
          { x: 3.6, y: 2.4 },
          { x: 7, y: 3.4 },
          { x: 8.2, y: 2.2 },
          { x: 8.8, y: 4 },
          { x: 5, y: 5.6 },
        ]}
        xLabel="price"
        yLabel="rating"
        quadrants={["cheap gems", "worth it", "fast fuel", "tourist traps"]}
      />
    ),
  },
  {
    title: "Vendors by switching cost and value",
    note: "The renewal meeting is about the bottom-right: expensive to leave, giving little back.",
    chart: (
      <Quadrant
        title="Vendors by lock-in and value"
        points={[
          { x: 1.8, y: 8.4 },
          { x: 2.8, y: 7.2 },
          { x: 3.2, y: 8.8 },
          { x: 7.6, y: 8.6 },
          { x: 8.4, y: 7 },
          { x: 2.2, y: 2.8 },
          { x: 3.8, y: 3.4 },
          { x: 7, y: 2.4 },
          { x: 8.6, y: 3.8 },
          { x: 8, y: 1.6 },
          { x: 5.2, y: 5 },
        ]}
        xLabel="switching cost"
        yLabel="value"
        quadrants={["easy keeps", "strategic", "drop anytime", "renegotiate"]}
      />
    ),
  },
];
