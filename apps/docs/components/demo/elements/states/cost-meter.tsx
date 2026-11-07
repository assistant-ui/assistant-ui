"use client";

import {
  CostMeter,
  type CostLine,
} from "@/components/assistant-ui/elements/cost-meter";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single-model",
    label: "One model",
    note: "The whole run used one model, so it fills the bar.",
    Component: () => (
      <CostMeter
        runCost="$0.42"
        sessionCost="$3.10"
        lines={[
          {
            model: "Sonnet 5",
            inputTokens: 61_400,
            outputTokens: 9_800,
            cost: "$0.42",
            share: 1,
          },
        ]}
      />
    ),
  },
  {
    key: "empty",
    label: "No spend",
    note: "Nothing has been billed yet, so the bar is empty and there are no rows.",
    Component: () => (
      <CostMeter runCost="$0.00" sessionCost="$0.00" lines={[]} />
    ),
  },
  {
    key: "tiny-share",
    label: "Tiny share",
    note: "A model with a share too small to draw still gets its row.",
    Component: () => (
      <CostMeter
        runCost="$4.12"
        sessionCost="$27.85"
        lines={[
          {
            model: "Opus 5",
            inputTokens: 182_000,
            outputTokens: 31_200,
            cost: "$4.11",
            share: 0.9998,
          },
          {
            model: "Haiku 4.5",
            inputTokens: 900,
            outputTokens: 40,
            cost: "$0.001",
            share: 0.0002,
          },
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Many models",
    note: "Long model names and token counts truncate, and many rows stack below the meter.",
    Component: () => {
      const lines: CostLine[] = [
        {
          model: "Opus 5 (1M context, extended thinking)",
          inputTokens: 812_400,
          outputTokens: 96_300,
          cost: "$19.40",
          share: 0.71,
        },
        {
          model: "Sonnet 5",
          inputTokens: 1_204_000,
          outputTokens: 140_200,
          cost: "$5.72",
          share: 0.21,
        },
        {
          model: "Haiku 4.5",
          inputTokens: 2_480_000,
          outputTokens: 61_000,
          cost: "$1.52",
          share: 0.055,
        },
        {
          model: "text-embedding-3-large",
          inputTokens: 6_120_000,
          outputTokens: 0,
          cost: "$0.80",
          share: 0.025,
        },
      ];
      return (
        <CostMeter runCost="$27.44" sessionCost="$1,284.06" lines={lines} />
      );
    },
  },
]);
