import { Sunburst } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
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
    read: "Engineering's inner arc is the widest, and its three outer teams split it 26–19–12 — platform eats more than product and infra combined trails it, facts the department-level number hid. Every outer arc sums exactly into its parent; ten teams, four departments, and the geometry audits the spreadsheet.",
    chart: (
      <Report title="Budget by department" chip="2 rings">
        <FigTooltip
          entries={{
            eng: 57,
            gtm: 39,
            ops: 22,
            design: 13,
            platform: 26,
            product: 19,
            infra: 12,
            sales: 18,
            marketing: 15,
            partners: 6,
            people: 13,
            finance: 9,
            brand: 8,
            systems: 5,
          }}
          unit="M"
        >
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
                    { label: "infra", value: 12 },
                  ],
                },
                {
                  label: "gtm",
                  children: [
                    { label: "sales", value: 18 },
                    { label: "marketing", value: 15 },
                    { label: "partners", value: 6 },
                  ],
                },
                {
                  label: "ops",
                  children: [
                    { label: "people", value: 13 },
                    { label: "finance", value: 9 },
                  ],
                },
                {
                  label: "design",
                  children: [
                    { label: "brand", value: 8 },
                    { label: "systems", value: 5 },
                  ],
                },
              ],
            }}
          />
        </FigTooltip>
      </Report>
    ),
  },
];
