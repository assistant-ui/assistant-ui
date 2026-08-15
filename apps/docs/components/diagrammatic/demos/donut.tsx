import { Donut } from "diagrammatic";

export function DonutDemo() {
  return (
    <Donut
      title="Storage by content type"
      items={[
        { label: "photos", value: 49 },
        { label: "video", value: 36 },
        { label: "docs", value: 27 },
        { label: "other", value: 16 },
      ]}
      center="128"
      centerLabel="GB used"
      format={(v) => `${v} GB`}
    />
  );
}
