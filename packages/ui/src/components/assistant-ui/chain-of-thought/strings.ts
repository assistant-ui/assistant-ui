"use client";

import { createContext, useContext } from "react";
import { summarizeTraceStats } from "./model";

/**
 * User-facing strings rendered by the runtime `ChainOfThought` component.
 * Override any subset via the `strings` prop (or {@link ChainOfThoughtStringsContext})
 * to localize or rebrand the panel. Count/duration-dependent labels are
 * functions so each locale controls its own grammar.
 *
 * Activity verbs for tool calls (e.g. "Searching the web") are resolved
 * separately — supply a `toolActivityLabels` resolver, including the catch-all
 * `"*"` key, to localize those.
 */
export type ChainOfThoughtStrings = {
  /** Primary trigger label. */
  reasoning: string;
  /** Trigger fallback shown while streaming with no resolved activity. */
  thinking: string;
  /** Empty-state body when the chain has no visible parts. */
  reasoningHidden: string;
  /**
   * Prefixes the streaming reasoning snippet shown in the collapsed trigger,
   * e.g. "Thinking: weighing the options". Receives the truncated snippet so
   * the localizer controls the wording and word order.
   */
  reasoningActivity: (snippet: string) => string;
  /** Jump-to-latest button text. */
  jumpToLatest: string;
  /** Jump-to-latest button accessible name. */
  jumpToLatestLabel: string;
  /** Trace trigger label shown while the chain is still streaming. */
  working: string;
  /** Terminal label for a completed chain (with optional elapsed seconds). */
  done: (seconds?: number | undefined) => string;
  /** Terminal label for a stopped/cancelled chain (with optional elapsed seconds). */
  stopped: (seconds?: number | undefined) => string;
  /**
   * Collapsed trace summary built from step counts, e.g.
   * "Researched 3 sources (2s)", "Ran 2 tools", or "Stopped after 4 steps"
   * (incomplete). Counts are pluralized via `Intl.PluralRules` in the default —
   * override this to localize the grammar for non-English locales.
   */
  traceSummary: (stats: {
    totalSteps: number;
    searchSteps: number;
    toolSteps: number;
    incomplete: boolean;
    durationSec?: number | undefined;
  }) => string;
};

/** Default English strings. */
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

/** Merges caller overrides onto the default strings. */
export const mergeChainOfThoughtStrings = (
  overrides?: Partial<ChainOfThoughtStrings> | undefined,
): ChainOfThoughtStrings =>
  overrides
    ? { ...defaultChainOfThoughtStrings, ...overrides }
    : defaultChainOfThoughtStrings;

/**
 * Resolved strings for the current ChainOfThought subtree. Defaults to English,
 * so the composable primitives work without a provider.
 */
export const ChainOfThoughtStringsContext =
  createContext<ChainOfThoughtStrings>(defaultChainOfThoughtStrings);

/** Reads the resolved ChainOfThought strings from context. */
export const useChainOfThoughtStrings = () =>
  useContext(ChainOfThoughtStringsContext);
