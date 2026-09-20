import { readFileSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./check-built-declarations.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

/**
 * The skills commit is pinned once per consumer because neither workspace can
 * import the other: the CLI cannot reach into `apps/docs`, and the docs app
 * does not depend on the `assistant-ui` package. Nothing else keeps the two
 * literals equal, so a bump that regenerates one and forgets the other serves a
 * snapshot from a different commit than `assistant-ui agent` fetches.
 */
export const SKILLS_COMMIT_PINS = [
  {
    file: "packages/cli/src/lib/agent-skill.ts",
    constant: "SKILLS_COMMIT",
    pattern: /\bSKILLS_COMMIT\s*=\s*"([0-9a-f]{40})"/,
    describes: "the commit `assistant-ui agent` fetches",
  },
  {
    file: "apps/docs/scripts/generate-agent-skills.mts",
    constant: "COMMIT",
    pattern: /\bCOMMIT\s*=\s*"([0-9a-f]{40})"/,
    describes:
      "the commit the /.well-known/agent-skills snapshot is built from",
  },
];

export function readPinnedCommits(root = repoRoot, pins = SKILLS_COMMIT_PINS) {
  return pins.map((pin) => {
    const source = readFileSync(path.join(root, pin.file), "utf8");
    const match = pin.pattern.exec(source);
    return { ...pin, commit: match?.[1] };
  });
}

export function findSkillsCommitProblems(readPins) {
  const missing = readPins.filter((pin) => pin.commit === undefined);
  if (missing.length > 0) return { missing, mismatched: [] };

  const [first] = readPins;
  const mismatched = readPins.filter((pin) => pin.commit !== first.commit);
  return { missing, mismatched };
}

export function runCheck(root = repoRoot) {
  const pins = readPinnedCommits(root);
  const { missing, mismatched } = findSkillsCommitProblems(pins);

  for (const pin of missing) {
    console.error(
      `Could not read a 40-character ${pin.constant} from ${pin.file}.`,
    );
  }

  if (mismatched.length > 0) {
    console.error("The assistant-ui/skills commit is pinned inconsistently:\n");
    for (const pin of pins) {
      console.error(`  ${pin.commit}  ${pin.file} (${pin.describes})`);
    }
    console.error(
      "\nBump every pin in the same change, and regenerate the docs snapshot when you do,",
    );
    console.error(
      "or the CLI and the published snapshot serve different skills.",
    );
  }

  if (missing.length > 0 || mismatched.length > 0) return false;

  console.log(
    `The assistant-ui/skills commit is pinned consistently across ${pins.length} files. (${pins[0].commit})`,
  );
  return true;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  if (!runCheck()) process.exit(1);
}
