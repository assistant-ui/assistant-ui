import { Dendrogram } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

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
];
