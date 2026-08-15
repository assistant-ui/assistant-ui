import { Waffle } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Survey: how often teams deploy",
    note: "Each cell is one percent; you can literally count the daily deployers.",
    chart: (
      <Waffle
        title="How often teams deploy"
        items={[
          { label: "daily", value: 38 },
          { label: "weekly", value: 27 },
          { label: "monthly", value: 22 },
          { label: "never", value: 13 },
        ]}
      />
    ),
  },
  {
    title: "How the city lives",
    note: "Households out of a hundred; living alone is a third of the grid now.",
    chart: (
      <Waffle
        title="Household types"
        items={[
          { label: "alone", value: 33 },
          { label: "couple", value: 28 },
          { label: "family", value: 26 },
          { label: "shared", value: 13 },
        ]}
      />
    ),
  },
  {
    title: "Earth's water, out of a hundred cells",
    note: "Fresh liquid water is one cell; the waffle makes scarcity countable.",
    chart: (
      <Waffle
        title="Earth's water"
        items={[
          { label: "ocean", value: 97 },
          { label: "ice", value: 2 },
          { label: "fresh", value: 1 },
        ]}
      />
    ),
  },
];
