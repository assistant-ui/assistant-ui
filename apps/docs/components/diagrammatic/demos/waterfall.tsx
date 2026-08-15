import { Waterfall } from "diagrammatic";

export function WaterfallDemo() {
  return (
    <Waterfall
      title="Gross to net"
      steps={[
        { label: "gross", value: 40, total: true },
        { label: "subs", value: 18 },
        { label: "addons", value: 14 },
        { label: "refunds", value: -22 },
        { label: "services", value: 20 },
        { label: "credits", value: -10 },
        { label: "net", value: 60, total: true },
      ]}
    />
  );
}
