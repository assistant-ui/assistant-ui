import { CirclePacking } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Org clusters, sized by headcount",
    setup:
      "A new executive asks for the org 'at a glance', and the chief of staff draws it as nested circles: groups contain teams, area is headcount, containment does the explaining.",
    read: "Platform is the big continent and core is its capital; labs floats small and separate, which is both its budget and its culture. Packing wastes space by design — that softness is why it reads as territory instead of spreadsheet.",
    chart: (
      <AppCard title="Org, at a glance" meta="71 people">
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
      </AppCard>
    ),
  },
];
