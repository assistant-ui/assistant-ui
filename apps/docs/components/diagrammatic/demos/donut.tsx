import { Donut } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Storage by content type",
    note: "The hole is not wasted space; it is where the total lives.",
    chart: (
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
    ),
  },
  {
    title: "A month of spending",
    note: "Rent takes the biggest arc, and the center makes the total impossible to miss.",
    chart: (
      <Donut
        title="Monthly spend"
        items={[
          { label: "rent", value: 1650 },
          { label: "food", value: 720 },
          { label: "transport", value: 260 },
          { label: "other", value: 570 },
        ]}
        center="$3.2k"
        centerLabel="per month"
        format={(v) => `$${v}`}
      />
    ),
  },
  {
    title: "A studio of forty-two, by discipline",
    note: "Headcount as arcs; engineering is half the ring and the center is the whole company.",
    chart: (
      <Donut
        title="Team by discipline"
        items={[
          { label: "eng", value: 21 },
          { label: "design", value: 9 },
          { label: "product", value: 7 },
          { label: "gtm", value: 5 },
        ]}
        center="42"
        centerLabel="people"
      />
    ),
  },
];
