import { Sunburst } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Budget by department, then team",
    setup:
      "A finance partner presents the annual budget in two rings: departments inside, their teams outside. The inner ring is the org chart; the outer ring is where the money actually lands.",
    read: "Engineering's inner arc is the widest, and its two outer teams split it 26 to 19 — platform eats more than product, a fact the department-level number hid. Every outer arc sums exactly into its parent; the geometry audits the spreadsheet.",
    chart: (
      <Report title="Budget by department" chip="2 rings">
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
      </Report>
    ),
  },
];
