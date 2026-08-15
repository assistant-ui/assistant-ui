import { Sankey } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Energy from sources to uses",
    setup:
      "An energy agency reports where the country's 78 TWh actually went: generation on the left, demand on the right, every link as wide as its flow. Sankeys are conservation laws you can look at.",
    read: "Solar carries the homes almost single-handedly while industry drinks from both sources — the diversification the plan called for. Every link conserves its TWh, and the widths are the argument: transport still runs entirely on gas.",
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
    setup:
      "A growth lead traces one month's 9.6k signups from acquisition channel to the plan they landed on, because 'search brings the most users' and 'search brings the best users' are different claims.",
    read: "Search feeds the free tier in bulk, but follow the ribbons into pro: nearly everyone who pays walked in through a referral. Channel budgets allocate by the left column's sizes; this chart argues they should allocate by the ribbons.",
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
    setup:
      "A budgeting app draws the month as flows: two income streams fan out into four spending buckets, every dollar in exactly one ribbon.",
    read: "Housing's ribbon is the one that hurts — over a third of the salary before anything else happens. The side gig flows mostly into savings, which is the household's quiet strategy made visible: the day job lives, the side gig saves.",
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
