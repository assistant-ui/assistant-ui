import { Column, formatCompact } from "diagrammatic";

export function ColumnDemo() {
  return (
    <Column
      title="Quarterly revenue"
      items={[
        { label: "Q1", value: 3_800_000 },
        { label: "Q2", value: 5_200_000 },
        { label: "Q3", value: 4_400_000 },
        { label: "Q4", value: 6_600_000 },
        { label: "Q1", value: 5_800_000 },
        { label: "Q2", value: 7_400_000 },
        { label: "Q3", value: 9_000_000 },
      ]}
      highlight="last"
      format={(v) => `$${formatCompact(v)}`}
    />
  );
}
