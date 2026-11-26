import type { Suite, SuiteCandidate, SuiteCase } from "../types.ts";

/** Suites load on demand, so one suite's dependencies never stop another from running. */
export const suites: Record<
  string,
  () => Promise<Suite<SuiteCase, SuiteCandidate, unknown>>
> = {
  "docs-exam": async () => (await import("./docs-exam/index.ts")).docsExam,
  "comment-hygiene": async () =>
    (await import("./comment-hygiene/index.ts")).commentHygiene,
  "test-quality": async () =>
    (await import("./test-quality/index.ts")).testQuality,
  "generative-ui": async () =>
    (await import("./generative-ui/index.ts")).generativeUI,
};
