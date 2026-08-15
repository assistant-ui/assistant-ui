import { Lollipop } from "diagrammatic";

export function LollipopDemo() {
  return (
    <Lollipop
      title="Satisfaction score by team"
      items={[
        { label: "support", value: 58 },
        { label: "sales", value: 84 },
        { label: "eng", value: 40 },
        { label: "ops", value: 66 },
        { label: "design", value: 92 },
        { label: "hr", value: 48 },
      ]}
    />
  );
}
