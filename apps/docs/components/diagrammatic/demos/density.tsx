import { Density } from "diagrammatic";

export function DensityDemo() {
  return (
    <Density
      title="Marathon finish times"
      bins={[2, 6, 14, 30, 52, 74, 88, 92, 80, 60, 46, 38, 30, 20, 10, 4]}
      marker={{ at: 6.7, label: "median 3:58" }}
      labels={["2:30", "3:30", "4:30", "5:30"]}
    />
  );
}
