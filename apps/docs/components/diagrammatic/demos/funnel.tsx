import { Funnel } from "diagrammatic";

export function FunnelDemo() {
  return (
    <Funnel
      title="Signup funnel"
      items={[
        { label: "visited", value: 8000 },
        { label: "signed up", value: 5760 },
        { label: "activated", value: 4000 },
        { label: "subscribed", value: 2720 },
        { label: "retained", value: 1760 },
      ]}
    />
  );
}
