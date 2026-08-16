import { Sunburst } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const ROOT = {
  label: "10.4k sessions",
  children: [
    {
      label: "docs",
      children: [
        { label: "guides", value: 1840 },
        { label: "api", value: 1320 },
        { label: "examples", value: 740 },
        { label: "search", value: 410 },
      ],
    },
    {
      label: "app",
      children: [
        { label: "thread", value: 1680 },
        { label: "compose", value: 920 },
        { label: "settings", value: 310 },
      ],
    },
    {
      label: "marketing",
      children: [
        { label: "home", value: 1560 },
        { label: "pricing", value: 880 },
        { label: "blog", value: 540 },
        { label: "changelog", value: 200 },
      ],
    },
  ],
};

export const glyph = (
  <Sunburst
    title="Sessions"
    root={{
      label: "sessions",
      children: [
        {
          label: "docs",
          children: [
            { label: "guides", value: 18 },
            { label: "api", value: 13 },
          ],
        },
        {
          label: "app",
          children: [
            { label: "thread", value: 17 },
            { label: "compose", value: 9 },
          ],
        },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Where 10.4k weekly sessions go",
    setup:
      "Two rings: surface, then page. The sunburst is a drill path around a center, not a budget poster.",
    read: "Docs is the outer majority, and guides plus api are most of that ring. The app's thread page is already as large as home. Pricing is the only marketing leaf that competes with a product surface.",
    source: "Unique sessions, week of 4 Aug 2025.",
    chart: (
      <FigTooltip
        entries={{
          guides: "1,840",
          api: "1,320",
          examples: "740",
          search: "410",
          thread: "1,680",
          compose: "920",
          settings: "310",
          home: "1,560",
          pricing: "880",
          blog: "540",
          changelog: "200",
        }}
      >
        <Sunburst
          density="figure"
          aspect={1.15}
          title="Weekly sessions"
          depth={2}
          root={ROOT}
        />
      </FigTooltip>
    ),
  },
];
