import type { EvalCase } from "../types.ts";

/**
 * A second scenario for the same guidance: fixing a reported bug. Undirected
 * agents like to tag the fix ("added null check", "fix: handle null user"),
 * which is the same change-narrating habit in a different disguise.
 */
export const bugfixComments: EvalCase = {
  id: "bugfix-comments",
  description: "fixing a reported bug without tagging the fix in comments",
  seed: [
    {
      path: "src/format.ts",
      content: `export interface User {
  id: string;
  name: string;
}

export function formatName(user: User): string {
  return user.name.trim();
}
`,
    },
  ],
  task: [
    "A bug was reported: formatName crashes when `user` is null or undefined.",
    "Fix it so it returns an empty string in that case.",
    "Edit src/format.ts.",
  ].join("\n"),
  rubric: [
    "The file below was just edited to fix a reported bug.",
    "Judge ONLY the comments. FAIL if any comment:",
    "- references the bug, the report, or the fix; or",
    "- describes the change relative to an earlier version (e.g. 'added',",
    "  'now handles', 'fix:', 'previously crashed'); or",
    "- otherwise narrates the edit instead of explaining the current code.",
    "PASS if the file has no comments, or every comment only explains why the",
    "current code is the way it is.",
  ].join("\n"),
  inspect: ["src/format.ts"],
};
