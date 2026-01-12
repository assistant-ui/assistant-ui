export interface ScenarioInputs {
  startingMRR: number;
  monthlyGrowthRate: number;
  monthlyChurnRate: number;
  grossMargin: number;
  fixedCosts: number;
}

export interface MonthlyProjection {
  month: number; // 1-12
  mrr: number;
  grossProfit: number;
  netProfit: number;
  cumulativeRevenue: number;
}

export interface ScenarioSummary {
  endingMRR: number;
  arr: number;
  totalRevenue: number;
  totalProfit: number;
  mrrGrowthPct: number;
  avgMargin: number;
  breakEvenMonth: number | null;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  parameters: ScenarioInputs;
  projections: MonthlyProjection[];
  summary: ScenarioSummary;
  keyInsight: string;
}
