import { CirclePacking } from "diagrammatic";

export function CirclePackingDemo() {
  return (
    <CirclePacking
      title="Org clusters"
      root={{
        label: "org",
        children: [
          {
            label: "platform",
            children: [
              { label: "core", value: 20 },
              { label: "infra", value: 9 },
              { label: "tools", value: 6 },
            ],
          },
          {
            label: "growth",
            children: [
              { label: "web", value: 12 },
              { label: "data", value: 7 },
              { label: "ads", value: 4 },
            ],
          },
          {
            label: "labs",
            children: [
              { label: "ai", value: 5 },
              { label: "research", value: 3 },
            ],
          },
        ],
      }}
    />
  );
}
