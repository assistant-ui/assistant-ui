import { PopulationPyramid } from "diagrammatic";

export function PopulationPyramidDemo() {
  return (
    <PopulationPyramid
      title="Age structure"
      bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
      left={{ name: "men", data: [22, 38, 56, 68, 76, 60, 42, 22] }}
      right={{ name: "women", data: [28, 42, 58, 64, 70, 56, 40, 24] }}
    />
  );
}
