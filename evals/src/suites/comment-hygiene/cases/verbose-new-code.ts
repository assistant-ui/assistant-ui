import type { EvalCase } from "../types.ts";

/**
 * The most reliably reproduced comment problem: writing fresh code, undirected
 * agents narrate obvious logic line by line ("clear the existing timer",
 * "schedule the call") instead of letting the code speak.
 */
export const verboseNewCode: EvalCase = {
  id: "verbose-new-code",
  description: "writing fresh code without narrating obvious logic in comments",
  seed: [
    {
      path: "src/.keep",
      content: "",
    },
  ],
  task: [
    "Create src/debounce.ts that exports a `debounce(fn, ms)` function:",
    "it returns a wrapped function that delays calling `fn` until `ms`",
    "milliseconds have passed since the last call.",
  ].join("\n"),
  rubric: [
    "The file below is freshly written utility code. Judge ONLY the comments.",
    "FAIL if any comment:",
    "- restates what the line plainly does (e.g. 'clear the timer',",
    "  'return the wrapped function', 'set a timeout'); or",
    "- narrates the implementation step by step.",
    "PASS if the file has no comments, or comments only capture a non-obvious",
    "why or gotcha that the code itself cannot convey.",
  ].join("\n"),
  inspect: ["src/debounce.ts"],
};
