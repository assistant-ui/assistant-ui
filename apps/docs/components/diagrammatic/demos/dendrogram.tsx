import { Dendrogram } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Support tickets clustered by topic",
    setup:
      "A support lead runs a clustering pass over a quarter of tickets, and the algorithm returns its work as a dendrogram: merge height is dissimilarity, so the tree records the order in which topics agreed to be related.",
    read: "Login and 2fa fuse first — highlighted, and at the lowest height, because they are the same complaint wearing two names. The macro insight is one level up: everything eventually joins the auth cluster before it joins anything else.",
    chart: (
      <AppCard title="Tickets, clustered" meta="one quarter">
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
      </AppCard>
    ),
  },
  {
    title: "Eight wines clustered by tasting notes",
    setup:
      "A sommelier scores eight wines across a tasting sheet and lets hierarchical clustering arrange them. The tree becomes the wine list's structure for the season.",
    read: "The two rieslings merge almost immediately — the palate agrees with the label. The orange wine joins everyone else last, at the tree's root height: the list's official oddball, and the by-the-glass gamble the tree just justified.",
    chart: (
      <Paper
        kicker="Wine"
        title="Eight wines, one tree"
        source="Source: blind tasting sheet"
      >
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
      </Paper>
    ),
  },
  {
    title: "Eight cities clustered by climate",
    setup:
      "A climate dataset clusters eight cities by temperature, rainfall, and humidity profiles, and the dendrogram files them into families no atlas page would guess.",
    read: "The desert pair splits from everything early, but the highlighted merge is the finding: San Francisco and Lima — different hemispheres, same fog — find each other across an ocean before either finds a neighbor. Climate does not read maps.",
    chart: (
      <Report title="Cities by climate" chip="clustered">
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
      </Report>
    ),
  },
];
