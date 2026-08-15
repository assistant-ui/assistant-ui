import { StackedArea } from "diagrammatic";

export function StackedAreaDemo() {
  return (
    <StackedArea
      title="Site traffic by channel"
      labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
      series={[
        { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
        { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
        { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
      ]}
    />
  );
}
