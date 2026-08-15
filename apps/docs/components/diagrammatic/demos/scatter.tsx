import { Scatter } from "diagrammatic";

const GADGETS = Array.from({ length: 26 }, (_, i) => ({
  x: 4 + i * 3 + (i % 5),
  y: 2.1 + i * 0.09 + (i % 7) * 0.05,
}));

export function ScatterDemo() {
  return (
    <Scatter
      title="Rating against hours of use"
      points={GADGETS}
      trend
      xLabel="hours of use"
      yLabel="rating"
    />
  );
}
