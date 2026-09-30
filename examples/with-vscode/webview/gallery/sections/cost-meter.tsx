import {
  CostMeter,
  type CostLine,
} from "@assistant-ui/ui/components/assistant-ui/elements/cost-meter.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const LINES: readonly CostLine[] = [
  {
    model: "Opus 5",
    inputTokens: 48_200,
    outputTokens: 12_400,
    cost: "$1.66",
    share: 0.62,
  },
  {
    model: "Sonnet 5",
    inputTokens: 92_800,
    outputTokens: 21_100,
    cost: "$0.86",
    share: 0.29,
  },
  {
    model: "Haiku 4.5",
    inputTokens: 140_000,
    outputTokens: 8_900,
    cost: "$0.24",
    share: 0.09,
  },
];

export default defineSections([
  {
    id: "cost-meter",
    title: "Cost meter",
    category: "agents",
    notes:
      "Three models sharing a run, and a single-model run with large counts.",
    render: () => (
      <States>
        <State label="three models">
          <CostMeter runCost="$2.76" sessionCost="$18.40" lines={LINES} />
        </State>
        <State label="one model, large counts">
          <CostMeter
            runCost="$1,204.18"
            sessionCost="$12,881.02"
            lines={[
              {
                model: "Opus 5 (extended context, batch)",
                inputTokens: 912_480_000,
                outputTokens: 48_120_000,
                cost: "$1,204.18",
                share: 1,
              },
            ]}
          />
        </State>
      </States>
    ),
  },
]);
