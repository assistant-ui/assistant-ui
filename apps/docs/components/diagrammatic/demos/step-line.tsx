import { StepLine } from "diagrammatic";

export function StepLineDemo() {
  return (
    <StepLine
      title="Seat price across releases"
      data={[19, 19, 29, 25, 39, 35, 49, 59]}
      labels={["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"]}
      format={(v) => `$${v}`}
    />
  );
}
