import type {
  ScenarioInputs,
  MonthlyProjection,
  ScenarioSummary,
} from "../types.ts";

export function calculateProjections(
  inputs: ScenarioInputs,
): MonthlyProjection[] {
  const {
    startingMRR,
    monthlyGrowthRate,
    monthlyChurnRate,
    grossMargin,
    fixedCosts,
  } = inputs;

  // Net growth rate (can be negative if churn > growth)
  const netGrowthRate = (monthlyGrowthRate - monthlyChurnRate) / 100;

  const projections: MonthlyProjection[] = [];
  let cumulativeRevenue = 0;

  for (let month = 1; month <= 12; month++) {
    // MRR with compound growth
    const mrr = startingMRR * Math.pow(1 + netGrowthRate, month);

    // Profit calculations
    const grossProfit = mrr * (grossMargin / 100);
    const netProfit = grossProfit - fixedCosts;

    // Cumulative revenue
    cumulativeRevenue += mrr;

    projections.push({
      month,
      mrr,
      grossProfit,
      netProfit,
      cumulativeRevenue,
    });
  }

  return projections;
}

export function calculateSummary(
  projections: MonthlyProjection[],
  inputs: ScenarioInputs,
): ScenarioSummary {
  const endingMRR = projections[11].mrr;
  const arr = endingMRR * 12;
  const totalRevenue = projections.reduce((sum, p) => sum + p.mrr, 0);
  const totalProfit = projections.reduce((sum, p) => sum + p.netProfit, 0);
  const mrrGrowthPct =
    ((endingMRR - inputs.startingMRR) / inputs.startingMRR) * 100;
  const avgMargin = (totalProfit / totalRevenue) * 100;

  // Find first month where netProfit >= 0
  const breakEvenProjection = projections.find((p) => p.netProfit >= 0);
  const breakEvenMonth = breakEvenProjection?.month ?? null;

  return {
    endingMRR,
    arr,
    totalRevenue,
    totalProfit,
    mrrGrowthPct,
    avgMargin,
    breakEvenMonth,
  };
}
