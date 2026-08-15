import { Slope } from "diagrammatic";

export function SlopeDemo() {
  return (
    <Slope
      title="Share of media time"
      items={[
        { label: "video", from: 30, to: 68 },
        { label: "social", from: 60, to: 50 },
        { label: "music", from: 45, to: 40 },
        { label: "tv", from: 70, to: 30 },
      ]}
      highlight="video"
      labels={["2020", "2025"]}
    />
  );
}
