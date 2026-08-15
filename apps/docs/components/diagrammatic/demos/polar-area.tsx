import { PolarArea } from "diagrammatic";

export function PolarAreaDemo() {
  return (
    <PolarArea
      title="Wind hours by direction"
      items={[
        { label: "N", value: 86 },
        { label: "NE", value: 52 },
        { label: "E", value: 71 },
        { label: "SE", value: 38 },
        { label: "S", value: 59 },
        { label: "SW", value: 28 },
        { label: "W", value: 47 },
        { label: "NW", value: 66 },
      ]}
    />
  );
}
