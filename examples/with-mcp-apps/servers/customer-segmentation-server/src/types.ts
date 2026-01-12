export interface Customer {
  id: string;
  name: string;
  segment: string;
  annualRevenue: number;
  employeeCount: number;
  accountAge: number;
  engagementScore: number;
  supportTickets: number;
  nps: number;
}

export interface SegmentSummary {
  name: string;
  count: number;
  color: string;
}

export const SEGMENT_COLORS: Record<string, string> = {
  Enterprise: "#1e40af",
  "Mid-Market": "#0d9488",
  SMB: "#059669",
  Startup: "#6366f1",
};

export const SEGMENTS = ["Enterprise", "Mid-Market", "SMB", "Startup"] as const;
export type SegmentName = (typeof SEGMENTS)[number];

export const METRIC_LABELS: Record<string, string> = {
  annualRevenue: "Annual Revenue",
  employeeCount: "Employees",
  accountAge: "Account Age (mo)",
  engagementScore: "Engagement",
  supportTickets: "Support Tickets",
  nps: "NPS",
};

export const METRICS = [
  "annualRevenue",
  "employeeCount",
  "accountAge",
  "engagementScore",
  "supportTickets",
  "nps",
] as const;
export type MetricName = (typeof METRICS)[number];
