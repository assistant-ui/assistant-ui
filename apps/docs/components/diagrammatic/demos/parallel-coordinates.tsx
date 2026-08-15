import { ParallelCoordinates } from "diagrammatic";

export function ParallelCoordinatesDemo() {
  return (
    <ParallelCoordinates
      title="Laptops across four spec axes"
      axes={["price", "battery", "weight", "screen"]}
      records={[
        { name: "air", values: [22, 58, 34, 70] },
        { name: "pro", values: [54, 30, 66, 42] },
        { name: "max", values: [80, 72, 50, 86] },
      ]}
    />
  );
}
