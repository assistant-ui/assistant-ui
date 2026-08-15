import { FlowMap } from "diagrammatic";

export function FlowMapDemo() {
  return (
    <FlowMap
      title="Shipments out of one hub"
      origin={{ col: 5, row: 3, label: "hub" }}
      routes={[
        { col: 13, row: 2, value: 26 },
        { col: 14, row: 4, value: 18 },
        { col: 11, row: 6, value: 12 },
      ]}
    />
  );
}
