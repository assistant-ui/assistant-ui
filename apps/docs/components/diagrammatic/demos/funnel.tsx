import { Funnel } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Signup funnel, visit to retained",
    setup:
      "A PM traces one cohort of eight thousand visitors through seven product stages, because 'conversion is 12%' hides which stage is doing the losing.",
    read: "Every stage keeps roughly seventy percent, and that innocent-looking rate compounds to 8000-becomes-940 by the end. No single stage is broken, which is the uncomfortable finding: fixing this funnel means nudging six steps, not rescuing one.",
    chart: (
      <AppCard title="Signup funnel" meta="one cohort">
        <Funnel
          title="Signup funnel"
          items={[
            { label: "visited", value: 8000 },
            { label: "viewed pricing", value: 5680 },
            { label: "signed up", value: 3980 },
            { label: "activated", value: 2760 },
            { label: "invited team", value: 1930 },
            { label: "subscribed", value: 1350 },
            { label: "retained", value: 940 },
          ]}
        />
      </AppCard>
    ),
  },
];
