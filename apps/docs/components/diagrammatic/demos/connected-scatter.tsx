import { ConnectedScatter } from "diagrammatic";

export function ConnectedScatterDemo() {
  return (
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
}
