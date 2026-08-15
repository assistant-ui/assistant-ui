import { Bubble } from "diagrammatic";

export function BubbleDemo() {
  return (
    <Bubble
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
  );
}
