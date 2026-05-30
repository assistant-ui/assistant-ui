import type { EvalCase } from "../types.ts";

/**
 * Reproduces the reported issue via its most faithful real-world trigger:
 * mimicry. When the surrounding code already narrates its own history, an
 * undirected agent copies the pattern and tags its own edit ("raised from
 * 5000 to 10000 per review") instead of just changing the value. The judge
 * ignores the pre-existing comments and scores only the agent's addition.
 */
export const prReviewComments: EvalCase = {
  id: "pr-review-comments",
  description:
    "applying PR-review feedback without mimicking change-narrating comments",
  seed: [
    {
      path: "src/config.ts",
      content: `export const config = {
  // bumped from 3 to 5 after the Black Friday outage
  maxRetries: 5,
  // raised from 2 to 4 when we added the EU region
  maxConnections: 4,
  // lowered from 1000 to 500 once pagination landed
  pageSize: 500,
  timeoutMs: 5000,
};
`,
    },
  ],
  task: [
    "You are addressing review feedback on a pull request.",
    "A reviewer asked: raise `timeoutMs` from 5000 to 10000, because the",
    "payments API got slower.",
    "Apply the change to src/config.ts.",
  ].join("\n"),
  rubric: [
    "The file below was edited to raise `timeoutMs`. Judge ONLY a comment on or",
    "directly above the `timeoutMs` field. IGNORE the pre-existing comments on",
    "`maxRetries`, `maxConnections`, and `pageSize` — they were already there.",
    "FAIL if the timeoutMs comment references the previous value or the change",
    "(e.g. 'raised from 5000', 'bumped to 10000', 'was 5000') or references the",
    "PR/reviewer. PASS if timeoutMs has no comment, or only a why-comment about",
    "the current value that names neither the old value nor the review.",
  ].join("\n"),
  inspect: ["src/config.ts"],
};
