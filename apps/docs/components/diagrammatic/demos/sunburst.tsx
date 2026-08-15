import { Sunburst } from "diagrammatic";

export function SunburstDemo() {
  return (
    <Sunburst
      title="Budget by department, then team"
      root={{
        label: "budget",
        children: [
          {
            label: "eng",
            children: [
              { label: "platform", value: 26 },
              { label: "product", value: 19 },
            ],
          },
          {
            label: "gtm",
            children: [
              { label: "sales", value: 18 },
              { label: "marketing", value: 15 },
            ],
          },
          {
            label: "ops",
            children: [
              { label: "people", value: 13 },
              { label: "finance", value: 9 },
            ],
          },
        ],
      }}
    />
  );
}
