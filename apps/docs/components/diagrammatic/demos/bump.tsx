import { Bump } from "diagrammatic";

export function BumpDemo() {
  return (
    <Bump
      title="Framework popularity rank"
      series={[
        { name: "react", ranks: [2, 1, 1, 2, 1] },
        { name: "jquery", ranks: [1, 2, 3, 3, 3] },
        { name: "vue", ranks: [3, 3, 2, 1, 2] },
        { name: "angular", ranks: [4, 4, 4, 4, 4] },
      ]}
      labels={["2021", "2022", "2023", "2024", "2025"]}
    />
  );
}
