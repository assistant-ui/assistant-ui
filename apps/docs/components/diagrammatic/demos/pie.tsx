import { Pie } from "diagrammatic";

export function PieDemo() {
  return (
    <Pie
      title="Browser share of sessions"
      items={[
        { label: "chrome", value: 42 },
        { label: "safari", value: 27 },
        { label: "edge", value: 19 },
        { label: "other", value: 12 },
      ]}
    />
  );
}
