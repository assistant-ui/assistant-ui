import { DivergingStacked } from "diagrammatic";

export function DivergingStackedDemo() {
  return (
    <DivergingStacked
      title="Would recommend, by team"
      rows={[
        { label: "eng", values: [8, 16, 18, 34, 24] },
        { label: "design", values: [14, 24, 22, 26, 14] },
        { label: "sales", values: [4, 10, 14, 40, 32] },
        { label: "support", values: [22, 30, 20, 18, 10] },
      ]}
      endLabels={["disagree", "agree"]}
    />
  );
}
