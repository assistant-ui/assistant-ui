import { Contour } from "diagrammatic";

const RUNNERS = Array.from({ length: 400 }, (_, i) => ({
  x: 172 + Math.sin(i * 1.9) * 11 + Math.sin(i * 0.41) * 6,
  y: 68 + Math.sin(i * 1.9) * 6.5 + Math.cos(i * 0.67) * 4,
}));

export function ContourDemo() {
  return (
    <Contour
      title="Height and weight of 5k runners"
      points={RUNNERS}
      xLabel="height (cm)"
      yLabel="weight (kg)"
    />
  );
}
