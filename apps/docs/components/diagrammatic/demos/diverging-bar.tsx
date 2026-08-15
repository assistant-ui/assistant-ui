import { DivergingBar } from "diagrammatic";

export function DivergingBarDemo() {
  return (
    <DivergingBar
      title="Revenue against plan"
      items={[
        { label: "cloud", value: 48 },
        { label: "search", value: 34 },
        { label: "mail", value: 26 },
        { label: "iot", value: 18 },
        { label: "maps", value: -12 },
        { label: "ads", value: -22 },
        { label: "video", value: -38 },
      ]}
      format={(v) => `${v}%`}
    />
  );
}
