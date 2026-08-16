import { StackedArea } from "diagrammatic";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <StackedArea
    title="Site traffic by channel"
    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
    series={[
      { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
      { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
      { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Grid generation mix across one day",
    setup:
      "A grid operator's dashboard shows the day's generation stacked by source, because demand must always equal the top edge. This is a sunny weekday in spring.",
    read: "Solar swells through midday and gas fills the morning and evening shoulders around it; the famous duck-curve shape is the gas band's waistline. Wind hums along flat underneath, indifferent to the sun.",
    chart: (
      <Terminal title="grid mix — live">
        <StackedArea
          title="Generation mix"
          labels={["00", "04", "08", "12", "16", "20", "24"]}
          series={[
            { name: "gas", data: [14, 13, 10, 6, 8, 15, 16] },
            { name: "wind", data: [9, 10, 8, 7, 8, 9, 10] },
            { name: "solar", data: [0, 0, 6, 16, 12, 2, 0] },
          ]}
        />
      </Terminal>
    ),
  },
];
