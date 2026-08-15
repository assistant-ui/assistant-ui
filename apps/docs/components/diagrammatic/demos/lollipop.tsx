import { Lollipop } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Satisfaction score by team",
    note: "A bar chart on a diet: the dot carries the value, the stem carries the eye.",
    chart: (
      <Lollipop
        title="Satisfaction score by team"
        items={[
          { label: "support", value: 58 },
          { label: "sales", value: 84 },
          { label: "eng", value: 40 },
          { label: "ops", value: 66 },
          { label: "design", value: 92 },
          { label: "hr", value: 48 },
        ]}
      />
    ),
  },
  {
    title: "Caffeine per serving",
    note: "Espresso's reputation outruns its milligrams; the drip mug quietly wins.",
    chart: (
      <Lollipop
        title="Caffeine per serving"
        items={[
          { label: "drip", value: 145 },
          { label: "energy", value: 110 },
          { label: "espresso", value: 63 },
          { label: "black tea", value: 47 },
          { label: "cola", value: 34 },
          { label: "cocoa", value: 12 },
        ]}
        format={(v) => `${v}mg`}
      />
    ),
  },
  {
    title: "Average one-way commute by city",
    note: "Six cities, one scale; the spread between best and worst is twenty minutes a day.",
    chart: (
      <Lollipop
        title="Commute minutes by city"
        items={[
          { label: "tokyo", value: 48 },
          { label: "london", value: 41 },
          { label: "nyc", value: 38 },
          { label: "berlin", value: 32 },
          { label: "austin", value: 27 },
          { label: "lisbon", value: 28 },
        ]}
        format={(v) => `${v} min`}
      />
    ),
  },
];
