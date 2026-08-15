import { Sankey } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Energy from sources to uses",
    note: "Every link conserves its TWh; the widths are the argument.",
    chart: (
      <Sankey
        title="Energy from sources to uses"
        graph={{
          nodes: [
            { id: "solar", label: "solar 46 TWh" },
            { id: "gas", label: "gas 32 TWh" },
            { id: "homes", label: "homes" },
            { id: "industry", label: "industry" },
            { id: "transport", label: "transport" },
          ],
          links: [
            { source: "solar", target: "homes", value: 28 },
            { source: "solar", target: "industry", value: 18 },
            { source: "gas", target: "industry", value: 12 },
            { source: "gas", target: "transport", value: 20 },
          ],
        }}
      />
    ),
  },
  {
    title: "Signups from channel to plan",
    note: "Search feeds the free tier; nearly everyone who pays walked in through a referral.",
    chart: (
      <Sankey
        title="Signups from channel to plan"
        graph={{
          nodes: [
            { id: "search", label: "search 5.2k" },
            { id: "referral", label: "referral 2.6k" },
            { id: "social", label: "social 1.8k" },
            { id: "free", label: "free" },
            { id: "pro", label: "pro" },
          ],
          links: [
            { source: "search", target: "free", value: 46 },
            { source: "search", target: "pro", value: 6 },
            { source: "referral", target: "free", value: 12 },
            { source: "referral", target: "pro", value: 14 },
            { source: "social", target: "free", value: 16 },
            { source: "social", target: "pro", value: 2 },
          ],
        }}
      />
    ),
  },
  {
    title: "A household budget, income to spending",
    note: "Two salaries fan out into four buckets; housing's ribbon is the one that hurts.",
    chart: (
      <Sankey
        title="Income to spending"
        graph={{
          nodes: [
            { id: "salary", label: "salary $6.4k" },
            { id: "side", label: "side gig $1.1k" },
            { id: "housing", label: "housing" },
            { id: "living", label: "living" },
            { id: "savings", label: "savings" },
            { id: "fun", label: "fun" },
          ],
          links: [
            { source: "salary", target: "housing", value: 26 },
            { source: "salary", target: "living", value: 20 },
            { source: "salary", target: "savings", value: 12 },
            { source: "salary", target: "fun", value: 6 },
            { source: "side", target: "savings", value: 7 },
            { source: "side", target: "fun", value: 4 },
          ],
        }}
      />
    ),
  },
];
