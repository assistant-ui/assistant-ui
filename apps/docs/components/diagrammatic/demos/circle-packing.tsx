import { CirclePacking } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Org clusters, sized by headcount",
    note: "Containment does the grouping; area does the counting.",
    chart: (
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
    ),
  },
  {
    title: "City parks by district, sized by acres",
    note: "The river district's one big park outweighs the north side's many small ones.",
    chart: (
      <CirclePacking
        title="Parks by district"
        root={{
          label: "city",
          children: [
            {
              label: "river",
              children: [
                { label: "waterfront", value: 28 },
                { label: "island", value: 6 },
              ],
            },
            {
              label: "north",
              children: [
                { label: "elm", value: 7 },
                { label: "birch", value: 5 },
                { label: "pocket", value: 3 },
              ],
            },
            {
              label: "old town",
              children: [
                { label: "commons", value: 12 },
                { label: "cemetery", value: 8 },
              ],
            },
          ],
        }}
      />
    ),
  },
  {
    title: "A fund's portfolio, sized by valuation",
    note: "One fintech position is half the fund; diversification looks different drawn to scale.",
    chart: (
      <CirclePacking
        title="Portfolio by sector"
        root={{
          label: "fund",
          children: [
            {
              label: "fintech",
              children: [
                { label: "ledgerly", value: 34 },
                { label: "paynest", value: 8 },
              ],
            },
            {
              label: "health",
              children: [
                { label: "curon", value: 10 },
                { label: "vitalgraph", value: 6 },
              ],
            },
            {
              label: "climate",
              children: [
                { label: "gridfox", value: 9 },
                { label: "soilscan", value: 4 },
              ],
            },
          ],
        }}
      />
    ),
  },
];
