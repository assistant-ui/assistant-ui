import type { Candidate } from "./types.ts";

/**
 * Guidance phrasings we're A/B testing for comment hygiene. `baseline` must
 * stay first and empty so every case measures the undirected behavior. The
 * goal is the shortest phrasing that reliably lifts the pass rate to 100% — the
 * winner is what earns a line in AGENTS.md / a skill.
 */
export const candidates: Candidate[] = [
  { label: "baseline", prompt: "" },
  {
    label: "describe-now",
    prompt: "Comments describe the code as it is, not how it changed.",
  },
  {
    label: "no-history",
    prompt:
      "Never write comments that reference the PR, the review, or a previous version of the code.",
  },
  {
    label: "why-not-what",
    prompt:
      "Comments explain why the code is the way it is; they never narrate what changed.",
  },
];
