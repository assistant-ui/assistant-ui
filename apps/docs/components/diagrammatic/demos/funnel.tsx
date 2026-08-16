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
      "A PM traces one cohort of eight thousand visitors through five product stages, because 'conversion is 22%' hides which stage is doing the losing.",
    read: "Every stage keeps roughly seventy percent, and that innocent-looking rate compounds to 8000-becomes-1760 by the end. No single stage is broken, which is the uncomfortable finding: fixing this funnel means nudging four steps, not rescuing one.",
    chart: (
      <AppCard title="Signup funnel" meta="one cohort">
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
      </AppCard>
    ),
  },
];
