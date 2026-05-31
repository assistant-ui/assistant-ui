"use client";

import { createContext, useContext } from "react";
import { summarizeTraceStats } from "./model";

export type ChainOfThoughtStrings = {
  reasoning: string;
  thinking: string;
  reasoningHidden: string;
  reasoningActivity: (snippet: string) => string;
  jumpToLatest: string;
  jumpToLatestLabel: string;
  working: string;
  done: (seconds?: number | undefined) => string;
  stopped: (seconds?: number | undefined) => string;
  traceSummary: (stats: {
    totalSteps: number;
    searchSteps: number;
    toolSteps: number;
    incomplete: boolean;
    durationSec?: number | undefined;
  }) => string;
};

export const defaultChainOfThoughtStrings: ChainOfThoughtStrings = {
  reasoning: "Reasoning",
  thinking: "Thinking...",
  reasoningHidden: "Reasoning hidden.",
  reasoningActivity: (snippet) => `Thinking: ${snippet}`,
  jumpToLatest: "Latest",
  jumpToLatestLabel: "Jump to latest chain-of-thought update",
  working: "Working...",
  done: (seconds) => (seconds != null ? `Done in ${seconds}s` : "Done"),
  stopped: (seconds) =>
    seconds != null ? `Stopped after ${seconds}s` : "Stopped",
  traceSummary: ({
    totalSteps,
    searchSteps,
    toolSteps,
    incomplete,
    durationSec,
  }) =>
    summarizeTraceStats(
      { totalSteps, searchSteps, toolSteps },
      durationSec,
      incomplete ? "incomplete" : "complete",
    ),
};

export const mergeChainOfThoughtStrings = (
  overrides?: Partial<ChainOfThoughtStrings> | undefined,
): ChainOfThoughtStrings =>
  overrides
    ? { ...defaultChainOfThoughtStrings, ...overrides }
    : defaultChainOfThoughtStrings;

export const ChainOfThoughtStringsContext =
  createContext<ChainOfThoughtStrings>(defaultChainOfThoughtStrings);

export const useChainOfThoughtStrings = () =>
  useContext(ChainOfThoughtStringsContext);
