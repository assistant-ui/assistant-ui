import type { Suite, SuiteCandidate, SuiteCase } from "../types.ts";

/** Suites load on demand, so one suite's dependencies never stop another from running. */
export const suites: Record<
  string,
  () => Promise<Suite<SuiteCase, SuiteCandidate, unknown>>
> = {
  "comment-hygiene": async () =>
    (await import("./comment-hygiene/index.ts")).commentHygiene,
  "generative-ui": async () =>
    (await import("./generative-ui/index.ts")).generativeUI,
};
