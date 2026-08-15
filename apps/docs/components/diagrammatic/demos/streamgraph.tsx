import { Streamgraph } from "diagrammatic";

export function StreamgraphDemo() {
  return (
    <Streamgraph
      title="Listening hours by genre"
      series={[
        { name: "pop", data: [8, 12, 16, 20, 24, 20, 16, 14, 12] },
        { name: "hip-hop", data: [6, 10, 14, 12, 16, 18, 14, 12, 10] },
        { name: "rock", data: [10, 8, 10, 14, 12, 16, 18, 16, 12] },
        { name: "lo-fi", data: [4, 6, 8, 8, 10, 12, 10, 12, 14] },
      ]}
    />
  );
}
