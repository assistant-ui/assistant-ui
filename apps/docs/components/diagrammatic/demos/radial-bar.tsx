import { RadialBar } from "diagrammatic";

export function RadialBarDemo() {
  return (
    <RadialBar
      title="Quarterly goals"
      items={[
        { label: "ship", value: 0.82 },
        { label: "quality", value: 0.58 },
        { label: "hiring", value: 0.36 },
      ]}
    />
  );
}
