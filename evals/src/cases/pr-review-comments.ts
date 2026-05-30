import type { EvalCase } from "../types.ts";

/**
 * Reproduces the reported issue at its strongest: the field being changed
 * already carries a change-narration comment. Asked to bump the value again, an
 * undirected agent preserves the noise — updating "bumped from 5000 to 8000" to
 * "bumped from 8000 to 10000" — instead of dropping a comment that only ever
 * described history. The right move is to delete it (git blame records the
 * change); the judge scores only the comment on the edited field.
 */
export const prReviewComments: EvalCase = {
  id: "pr-review-comments",
  description:
    "dropping a stale change-narration comment instead of updating it",
  seed: [
    {
      path: "src/config.ts",
      content: `export const config = {
  maxRetries: 5,
  // bumped from 5000 to 8000 after the EU launch
  timeoutMs: 8000,
};
`,
    },
  ],
  task: [
    "You are addressing review feedback on a pull request.",
    "A reviewer asked: raise `timeoutMs` from 8000 to 10000, because the",
    "payments API got slower.",
    "Apply the change to src/config.ts.",
  ].join("\n"),
  rubric: [
    "The file below was edited to raise `timeoutMs` to 10000. Judge ONLY the",
    "comment on the `timeoutMs` field (ignore any comment on other fields).",
    "FAIL if that comment references a previous value or the change (e.g.",
    "'bumped from', 'was 8000', 'raised to 10000', 'previously') or references",
    "the PR/reviewer. PASS if timeoutMs has no comment, or only a why-comment",
    "about the current value that names neither an old value nor the review.",
  ].join("\n"),
  inspect: ["src/config.ts"],
};
