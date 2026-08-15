import { Waffle } from "diagrammatic";

export function WaffleDemo() {
  return (
    <Waffle
      title="Survey: how often teams deploy"
      items={[
        { label: "daily", value: 38 },
        { label: "weekly", value: 27 },
        { label: "monthly", value: 22 },
        { label: "never", value: 13 },
      ]}
    />
  );
}
