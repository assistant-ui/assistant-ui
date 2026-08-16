import { Dendrogram } from "diagrammatic";
import type { DemoExample } from "./types";

const LEAVES = [
  "login",
  "2fa",
  "session",
  "billing",
  "refund",
  "invoice",
  "export",
  "api-key",
  "webhook",
  "mobile",
  "crash",
  "other",
];

const MERGES = [
  { a: 0, b: 1, height: 0.12 },
  { a: 12, b: 2, height: 0.18 },
  { a: 3, b: 4, height: 0.16 },
  { a: 14, b: 5, height: 0.22 },
  { a: 6, b: 7, height: 0.2 },
  { a: 16, b: 8, height: 0.28 },
  { a: 9, b: 10, height: 0.19 },
  { a: 13, b: 15, height: 0.4 },
  { a: 19, b: 17, height: 0.52 },
  { a: 20, b: 18, height: 0.61 },
  { a: 21, b: 11, height: 0.78 },
];

export const glyph = (
  <Dendrogram
    title="Ticket clusters"
    leaves={LEAVES.slice(0, 8)}
    merges={[
      { a: 0, b: 1, height: 0.12 },
      { a: 8, b: 2, height: 0.18 },
      { a: 3, b: 4, height: 0.16 },
      { a: 10, b: 5, height: 0.22 },
      { a: 6, b: 7, height: 0.19 },
      { a: 9, b: 11, height: 0.4 },
      { a: 13, b: 12, height: 0.52 },
    ]}
    highlight={4}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Support tickets, cut at 0.40",
    setup:
      "Twelve topics, merge height is cosine distance. The highlight is the cut that defines the clusters the queue actually uses.",
    read: "Login, 2fa, and session join first. Billing, refund, and invoice join next. The highlight sits on the last merge under 0.40, before auth is glued to billing. Other hangs off the last join, which is what leftover should do.",
    source: "Ticket embeddings, Q2 2025. Cut at height 0.40.",
    chart: (
      <Dendrogram
        density="figure"
        aspect={1.8}
        title="Ticket clusters"
        leaves={LEAVES}
        merges={MERGES}
        highlight={6}
      />
    ),
  },
];
