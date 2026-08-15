import { Bar } from "diagrammatic";

export function BarDemo() {
  return (
    <Bar
      title="Weekly npm downloads"
      items={[
        { label: "react", value: 25_000_000 },
        { label: "vue", value: 12_000_000 },
        { label: "svelte", value: 6_200_000 },
        { label: "solid", value: 2_100_000 },
        { label: "qwik", value: 900_000 },
      ]}
    />
  );
}
