import { Dendrogram } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Support tickets clustered by topic",
    note: "Merge height is dissimilarity; login and 2fa fuse first because they are the same complaint.",
    chart: (
      <Dendrogram
        title="Support tickets clustered by topic"
        leaves={[
          "login",
          "2fa",
          "billing",
          "refund",
          "export",
          "api",
          "mobile",
          "other",
        ]}
        merges={[
          { a: 0, b: 1, height: 1 },
          { a: 2, b: 3, height: 1.4 },
          { a: 8, b: 9, height: 2.2 },
          { a: 4, b: 5, height: 1.6 },
          { a: 6, b: 7, height: 1.2 },
          { a: 11, b: 12, height: 2.6 },
          { a: 10, b: 13, height: 3.2 },
        ]}
        highlight={0}
      />
    ),
  },
  {
    title: "Eight wines clustered by tasting notes",
    note: "The two rieslings merge almost immediately; the orange wine joins everyone else last.",
    chart: (
      <Dendrogram
        title="Wines by tasting profile"
        leaves={[
          "riesling a",
          "riesling b",
          "chablis",
          "sancerre",
          "rioja",
          "malbec",
          "syrah",
          "orange",
        ]}
        merges={[
          { a: 0, b: 1, height: 0.8 },
          { a: 2, b: 3, height: 1.1 },
          { a: 8, b: 9, height: 1.8 },
          { a: 4, b: 5, height: 1.3 },
          { a: 11, b: 6, height: 2 },
          { a: 10, b: 12, height: 2.8 },
          { a: 13, b: 7, height: 3.6 },
        ]}
        highlight={0}
      />
    ),
  },
  {
    title: "Eight cities clustered by climate",
    note: "The desert pair splits from everything early; the two fog cities find each other across an ocean.",
    chart: (
      <Dendrogram
        title="Cities by climate"
        leaves={[
          "lisbon",
          "athens",
          "phoenix",
          "riyadh",
          "london",
          "seattle",
          "sf",
          "lima",
        ]}
        merges={[
          { a: 0, b: 1, height: 1 },
          { a: 2, b: 3, height: 0.9 },
          { a: 4, b: 5, height: 1.1 },
          { a: 6, b: 7, height: 1.2 },
          { a: 10, b: 11, height: 1.9 },
          { a: 8, b: 12, height: 2.6 },
          { a: 13, b: 9, height: 3.4 },
        ]}
        highlight={3}
      />
    ),
  },
];
