import { CirclePacking } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const ROOT = {
  label: "pages",
  children: [
    {
      label: "checkout",
      children: [
        { label: "api", value: 184 },
        { label: "web", value: 96 },
        { label: "workers", value: 41 },
      ],
    },
    {
      label: "search",
      children: [
        { label: "query", value: 72 },
        { label: "index", value: 38 },
        { label: "rank", value: 22 },
      ],
    },
    {
      label: "growth",
      children: [
        { label: "email", value: 28 },
        { label: "ads", value: 19 },
        { label: "seo", value: 11 },
      ],
    },
    {
      label: "platform",
      children: [
        { label: "auth", value: 34 },
        { label: "billing", value: 27 },
        { label: "flags", value: 9 },
      ],
    },
  ],
};

export const glyph = (
  <CirclePacking
    title="Pages by family"
    root={{
      label: "pages",
      children: [
        {
          label: "checkout",
          children: [
            { label: "api", value: 18 },
            { label: "web", value: 10 },
          ],
        },
        {
          label: "search",
          children: [
            { label: "query", value: 7 },
            { label: "index", value: 4 },
          ],
        },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Pages last quarter, by service family",
    setup:
      "Incidents are packed by the family that owned them, then by service. Circle area shows page count, while nesting shows membership.",
    read: "Checkout is the planet. api inside it is larger than every search service combined. Growth is a moon. Checkout has 321 pages, more than search, growth, and platform combined.",
    source: "Pages, last 90 days. n = 581.",
    chart: (
      <FigTooltip
        entries={{
          api: 184,
          web: 96,
          workers: 41,
          query: 72,
          index: 38,
          rank: 22,
          email: 28,
          ads: 19,
          seo: 11,
          auth: 34,
          billing: 27,
          flags: 9,
        }}
      >
        <CirclePacking
          aspect={1.15}
          title="Pages by service family"
          root={ROOT}
        />
      </FigTooltip>
    ),
  },
];
