import { Lollipop } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Caffeine per serving",
    setup:
      "A health page ranks common drinks by caffeine per serving, because the folk ranking is confidently wrong and the correction deserves a clean chart.",
    read: "Espresso's reputation outruns its milligrams: the drip mug nearly triples it. Even the energy drink loses to plain filter coffee. The dots make the exact values quotable, which is what a myth-busting chart needs.",
    chart: (
      <Paper
        kicker="Health"
        title="Caffeine, honestly"
        source="Source: beverage lab assays"
      >
        <Lollipop
          title="Caffeine per serving"
          items={[
            { label: "drip", value: 145 },
            { label: "cold brew", value: 128 },
            { label: "energy", value: 110 },
            { label: "latte", value: 77 },
            { label: "matcha", value: 70 },
            { label: "espresso", value: 63 },
            { label: "black tea", value: 47 },
            { label: "cola", value: 34 },
            { label: "cocoa", value: 12 },
            { label: "decaf", value: 5 },
          ]}
          format={(v) => `${v}mg`}
        />
      </Paper>
    ),
  },
];
