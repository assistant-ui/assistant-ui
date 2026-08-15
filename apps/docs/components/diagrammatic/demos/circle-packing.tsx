import { CirclePacking } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Org clusters, sized by headcount",
    setup:
      "A new executive asks for the org 'at a glance', and the chief of staff draws it as nested circles: groups contain teams, area is headcount, containment does the explaining.",
    read: "Platform is the big continent and core is its capital; labs floats small and separate, which is both its budget and its culture. Packing wastes space by design — that softness is why it reads as territory instead of spreadsheet.",
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
    setup:
      "A parks department maps its green space as circles within districts for the annual report, because acreage tables never survive a council meeting.",
    read: "The river district's one big park outweighs the north side's many small ones — different philosophies of green space in one picture. Pocket parks read as the scatter of dots they are; the waterfront reads as the anchor it is.",
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
    setup:
      "A venture fund's LP letter draws the portfolio as circles inside sectors, sized by current valuation, because the table version lets everyone skim past the concentration risk.",
    read: "One fintech position is half the fund. Drawn to scale, 'diversified across three sectors' looks like what it is: a planet with moons. The health and climate clusters together barely match ledgerly's single circle.",
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
