import { Treemap } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const ROOT = {
  label: "opex · $84m",
  children: [
    {
      label: "engineering",
      children: [
        { label: "platform", value: 14.2 },
        { label: "product", value: 11.6 },
        { label: "infra", value: 8.4 },
        { label: "data", value: 6.1 },
        { label: "security", value: 3.8 },
      ],
    },
    {
      label: "gtm",
      children: [
        { label: "sales", value: 12.4 },
        { label: "success", value: 5.6 },
        { label: "marketing", value: 4.9 },
        { label: "partners", value: 2.2 },
      ],
    },
    {
      label: "g&a",
      children: [
        { label: "people", value: 4.8 },
        { label: "finance", value: 3.1 },
        { label: "legal", value: 2.4 },
        { label: "facilities", value: 2.1 },
        { label: "other", value: 2.4 },
      ],
    },
  ],
};

export const glyph = (
  <Treemap
    title="Opex"
    root={{
      label: "opex",
      children: [
        {
          label: "eng",
          children: [
            { label: "platform", value: 14 },
            { label: "product", value: 12 },
          ],
        },
        {
          label: "gtm",
          children: [
            { label: "sales", value: 12 },
            { label: "cs", value: 6 },
          ],
        },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "FY25 opex, three branches",
    setup:
      "A treemap with four tiles is a pie. This one is the annual opex tree: engineering, go-to-market, and G&A, then the teams inside them.",
    read: "Engineering is half the page. Platform alone is larger than all of G&A. Sales is the only GTM tile that competes with a product team. The small legal and facilities cells are why this is a treemap and not five columns.",
    source: "FY25 operating expense, $84.0m. Leaves are teams.",
    chart: (
      <FigTooltip
        entries={{
          platform: "$14.2m",
          product: "$11.6m",
          infra: "$8.4m",
          data: "$6.1m",
          security: "$3.8m",
          sales: "$12.4m",
          success: "$5.6m",
          marketing: "$4.9m",
          partners: "$2.2m",
          people: "$4.8m",
          finance: "$3.1m",
          legal: "$2.4m",
          facilities: "$2.1m",
          other: "$2.4m",
        }}
      >
        <Treemap
          density="figure"
          aspect={1.55}
          title="FY25 opex"
          depth={2}
          root={ROOT}
        />
      </FigTooltip>
    ),
  },
];
