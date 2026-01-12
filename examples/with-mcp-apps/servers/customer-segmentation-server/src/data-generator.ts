import type { Customer, SegmentSummary, SegmentName } from "./types.ts";
import { SEGMENT_COLORS, SEGMENTS } from "./types.ts";

// Company name generation
const PREFIXES = [
  "Apex",
  "Nova",
  "Prime",
  "Vertex",
  "Atlas",
  "Quantum",
  "Summit",
  "Nexus",
  "Titan",
  "Pinnacle",
  "Zenith",
  "Vanguard",
  "Horizon",
  "Stellar",
  "Onyx",
  "Cobalt",
  "Vector",
  "Pulse",
  "Forge",
  "Spark",
];

const CORES = [
  "Tech",
  "Data",
  "Cloud",
  "Logic",
  "Sync",
  "Flow",
  "Core",
  "Net",
  "Soft",
  "Wave",
  "Link",
  "Mind",
  "Byte",
  "Grid",
  "Hub",
];

const SUFFIXES = [
  "Corp",
  "Inc",
  "Solutions",
  "Systems",
  "Labs",
  "Group",
  "Industries",
  "Dynamics",
  "Partners",
  "Ventures",
  "Global",
  "Digital",
];

// Cluster centers for each segment
interface ClusterCenter {
  annualRevenue: { min: number; max: number };
  employeeCount: { min: number; max: number };
  accountAge: { min: number; max: number };
  engagementScore: { min: number; max: number };
  supportTickets: { min: number; max: number };
  nps: { min: number; max: number };
}

const CLUSTER_CENTERS: Record<SegmentName, ClusterCenter> = {
  Enterprise: {
    annualRevenue: { min: 2_000_000, max: 10_000_000 },
    employeeCount: { min: 500, max: 5000 },
    accountAge: { min: 60, max: 120 },
    engagementScore: { min: 70, max: 95 },
    supportTickets: { min: 5, max: 20 },
    nps: { min: 40, max: 80 },
  },
  "Mid-Market": {
    annualRevenue: { min: 500_000, max: 2_000_000 },
    employeeCount: { min: 100, max: 500 },
    accountAge: { min: 36, max: 84 },
    engagementScore: { min: 60, max: 85 },
    supportTickets: { min: 10, max: 30 },
    nps: { min: 20, max: 60 },
  },
  SMB: {
    annualRevenue: { min: 50_000, max: 500_000 },
    employeeCount: { min: 10, max: 100 },
    accountAge: { min: 12, max: 48 },
    engagementScore: { min: 40, max: 70 },
    supportTickets: { min: 15, max: 40 },
    nps: { min: 0, max: 40 },
  },
  Startup: {
    annualRevenue: { min: 10_000, max: 200_000 },
    employeeCount: { min: 1, max: 50 },
    accountAge: { min: 1, max: 24 },
    engagementScore: { min: 50, max: 90 },
    supportTickets: { min: 5, max: 25 },
    nps: { min: 10, max: 70 },
  },
};

// Segment distribution weights
const SEGMENT_WEIGHTS: Record<SegmentName, number> = {
  Enterprise: 0.15,
  "Mid-Market": 0.25,
  SMB: 0.35,
  Startup: 0.25,
};

// Box-Muller transform for Gaussian random numbers
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Generate a value within range with Gaussian distribution centered in range
function generateClusteredValue(min: number, max: number): number {
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 4; // 95% of values within range
  const value = gaussianRandom(mean, stdDev);
  return Math.max(min * 0.8, Math.min(max * 1.2, value)); // Allow slight overflow
}

// Generate unique company name
function generateCompanyName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const core = CORES[Math.floor(Math.random() * CORES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const name = `${prefix} ${core} ${suffix}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback: add a number
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const core = CORES[Math.floor(Math.random() * CORES.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${prefix} ${core} ${num}`;
}

// Select segment based on weights
function selectSegment(): SegmentName {
  const rand = Math.random();
  let cumulative = 0;
  for (const segment of SEGMENTS) {
    cumulative += SEGMENT_WEIGHTS[segment];
    if (rand < cumulative) {
      return segment;
    }
  }
  return "SMB";
}

// Generate a single customer
function generateCustomer(id: number, usedNames: Set<string>): Customer {
  const segment = selectSegment();
  const center = CLUSTER_CENTERS[segment];

  return {
    id: `cust-${id.toString().padStart(4, "0")}`,
    name: generateCompanyName(usedNames),
    segment,
    annualRevenue: Math.round(
      generateClusteredValue(
        center.annualRevenue.min,
        center.annualRevenue.max,
      ),
    ),
    employeeCount: Math.round(
      generateClusteredValue(
        center.employeeCount.min,
        center.employeeCount.max,
      ),
    ),
    accountAge: Math.round(
      generateClusteredValue(center.accountAge.min, center.accountAge.max),
    ),
    engagementScore: Math.round(
      generateClusteredValue(
        center.engagementScore.min,
        center.engagementScore.max,
      ),
    ),
    supportTickets: Math.round(
      generateClusteredValue(
        center.supportTickets.min,
        center.supportTickets.max,
      ),
    ),
    nps: Math.round(generateClusteredValue(center.nps.min, center.nps.max)),
  };
}

// Generate all customers
export function generateCustomers(count: number = 250): Customer[] {
  const usedNames = new Set<string>();
  const customers: Customer[] = [];

  for (let i = 0; i < count; i++) {
    customers.push(generateCustomer(i + 1, usedNames));
  }

  return customers;
}

// Generate segment summaries from customers
export function generateSegmentSummaries(
  customers: Customer[],
): SegmentSummary[] {
  const counts = new Map<string, number>();

  for (const customer of customers) {
    counts.set(customer.segment, (counts.get(customer.segment) || 0) + 1);
  }

  return SEGMENTS.map((segment) => ({
    name: segment,
    count: counts.get(segment) || 0,
    color: SEGMENT_COLORS[segment],
  }));
}
