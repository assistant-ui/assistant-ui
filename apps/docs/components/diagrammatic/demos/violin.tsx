import { Violin } from "diagrammatic";

export function ViolinDemo() {
  return (
    <Violin
      title="Review scores by category"
      groups={[
        { label: "apps", widths: [1, 4, 9, 13, 10, 5, 2], median: 0.55 },
        { label: "games", widths: [2, 6, 12, 15, 13, 8, 3], median: 0.48 },
        { label: "tools", widths: [1, 3, 7, 11, 14, 9, 3], median: 0.4 },
      ]}
    />
  );
}
