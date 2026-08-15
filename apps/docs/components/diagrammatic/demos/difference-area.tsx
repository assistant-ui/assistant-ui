import { DifferenceArea } from "diagrammatic";

export function DifferenceAreaDemo() {
  return (
    <DifferenceArea
      title="Actual revenue against forecast"
      actual={{
        name: "actual",
        data: [30, 44, 56, 48, 40, 34, 46, 62, 74, 84],
      }}
      reference={{
        name: "forecast",
        data: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58],
      }}
      labels={["Jan", "Apr", "Jul", "Oct"]}
    />
  );
}
