import { FlowMap } from "diagrammatic";

export default function EgressFlowMap() {
  return (
    <div data-dg-motion="">
      <FlowMap
        aspect={1.7}
        title="Egress from iad-1, live"
        origin={{ col: 13, row: 2, label: "iad-1" }}
        routes={[
          { col: 4, row: 1, value: 84 },
          { col: 14, row: 3, value: 41 },
          { col: 15, row: 3, value: 28 },
          { col: 11, row: 6, value: 19 },
          { col: 5, row: 6, value: 12 },
          { col: 2, row: 2, value: 9 },
        ]}
      />
    </div>
  );
}
