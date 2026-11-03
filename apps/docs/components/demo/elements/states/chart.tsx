"use client";

import { Chart } from "@/components/assistant-ui/elements/chart";
import { defineStates } from "./types";

const POINTS = [
  18, 22, 19, 31, 28, 42, 38, 51, 47, 63, 58, 71, 69, 84, 92,
] as const;

const LATENCY = [
  0.8, 0.82, 0.79, 0.85, 0.9, 0.88, 0.97, 1.02, 1.0, 1.08, 1.15, 1.12, 1.21,
  1.26, 1.34,
] as const;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "Only the first six points of the series have arrived.",
    Component: () => (
      <Chart
        label="Runs this week"
        value="42"
        delta="+12%"
        points={POINTS}
        visibleCount={6}
        variant="area"
      />
    ),
  },
  {
    key: "single-point",
    label: "Single point",
    note: "The series has one value, so there is no line yet.",
    Component: () => (
      <Chart
        label="Runs today"
        value="18"
        points={[18]}
        visibleCount={1}
        variant="line"
      />
    ),
  },
  {
    key: "bad-trend",
    label: "Bad trend",
    note: "A rise in latency is bad news, so the delta reads red.",
    Component: () => (
      <Chart
        label="p95 latency"
        value="1.34s"
        delta="+68%"
        points={LATENCY}
        visibleCount={LATENCY.length}
        variant="line"
        upIsGood={false}
      />
    ),
  },
  {
    key: "flat",
    label: "Flat",
    note: "No change over the period, so the delta stays neutral.",
    Component: () => (
      <Chart
        label="Active seats"
        value="24"
        delta="0%"
        points={[24, 24, 24, 24, 24, 24, 24, 24]}
        visibleCount={8}
        variant="bars"
      />
    ),
  },
  {
    key: "empty",
    label: "All zero",
    note: "Every point in the series is zero.",
    Component: () => (
      <Chart
        label="Failed runs"
        value="0"
        delta="0%"
        points={[0, 0, 0, 0, 0, 0, 0]}
        visibleCount={7}
        variant="bars"
      />
    ),
  },
]);
