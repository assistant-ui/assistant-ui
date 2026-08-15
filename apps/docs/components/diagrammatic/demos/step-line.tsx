import { StepLine } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Seat price across eight releases",
    note: "Prices hold between releases; the flats are the truth, not the jumps.",
    chart: (
      <StepLine
        title="Seat price across releases"
        data={[19, 19, 29, 25, 39, 35, 49, 59]}
        labels={["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"]}
        format={(v) => `$${v}`}
      />
    ),
  },
  {
    title: "Policy rate across nine central-bank meetings",
    note: "A staircase up, a pause, then the first cut; nothing happens between meetings.",
    chart: (
      <StepLine
        title="Policy rate by meeting"
        data={[0.5, 1, 1.75, 2.5, 3.25, 4, 4, 4, 3.75]}
        labels={["", "Mar", "", "Jun", "", "Sep", "", "Dec", ""]}
        format={(v) => `${v}%`}
      />
    ),
  },
  {
    title: "First-class stamp price, 2010 to 2024",
    note: "Postage only ever moves by decree; each plateau is a rate case.",
    chart: (
      <StepLine
        title="Stamp price"
        data={[44, 45, 46, 49, 47, 50, 55, 58, 60, 66, 68]}
        labels={[
          "'10",
          "",
          "'12",
          "'14",
          "'16",
          "'18",
          "'19",
          "'21",
          "'22",
          "'23",
          "'24",
        ]}
        format={(v) => `${v}¢`}
      />
    ),
  },
];
