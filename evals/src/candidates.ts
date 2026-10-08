import type { Candidate } from "./types.ts";

const COMMENT_CASES = [
  "pr-review-comments",
  "bugfix-comments",
  "verbose-new-code",
];

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
    caseIds: COMMENT_CASES,
  },
  {
    label: "no-history",
    prompt:
      "Never write comments that reference the PR, the review, or a previous version of the code.",
    caseIds: COMMENT_CASES,
  },
  {
    label: "why-not-what",
    prompt:
      "Comments explain why the code is the way it is; they never narrate what changed.",
    caseIds: COMMENT_CASES,
  },
  // Targeted at the reproduced behavior: deleting an existing history comment,
  // not just declining to write a new one.
  {
    label: "delete-stale",
    prompt:
      "When you change code, delete any comment that only records its history.",
    caseIds: COMMENT_CASES,
  },
  {
    label: "drop-tombstones",
    prompt:
      "Code comments describe the current code, never its history. When you edit a line, remove any nearby comment that just narrates a past change.",
    caseIds: COMMENT_CASES,
  },
  {
    label: "edit-registry-source",
    prompt:
      "Registry files are generated. For a registry component change, edit the matching source under packages/ui/src instead of apps/registry.",
    caseIds: ["registry-source-of-truth"],
  },
  {
    label: "optional-host-sdk-peer",
    prompt:
      "For an optional host SDK, use peerDependencies with a compatible range, peerDependenciesMeta.<name>.optional true, an exact devDependencies pin, and no dependencies entry.",
    caseIds: ["optional-host-sdk-dependency"],
  },
];
