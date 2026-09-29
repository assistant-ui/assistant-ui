import { readFileSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./check-built-declarations.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

// Each workspace keeps its own pin because neither can import the other, and the committed snapshot is a third pin because the docs build serves it without regenerating it.
export const SKILLS_COMMIT_PINS = [
  {
    file: "packages/cli/src/lib/agent-skill.ts",
    pattern: /^export const SKILLS_COMMIT = "([0-9a-f]{40})";$/m,
    describes: "the commit `assistant-ui agent` fetches",
  },
  {
    file: "apps/docs/scripts/generate-agent-skills.mts",
    pattern: /^const COMMIT = "([0-9a-f]{40})";$/m,
    describes: "the commit the agent-skills snapshot is generated from",
  },
  {
    file: "apps/docs/lib/agent-skills.generated.json",
    pattern: /"source": "assistant-ui\/skills@([0-9a-f]{40})"/,
    describes: "the commit the committed snapshot was generated from",
    regenerateWith: "pnpm -C apps/docs generate:agent-skills",
  },
];

export function readPinnedCommits(root = repoRoot, pins = SKILLS_COMMIT_PINS) {
  return pins.map((pin) => {
    let source;
    try {
      source = readFileSync(path.join(root, pin.file), "utf8");
    } catch (error) {
      return { ...pin, commit: undefined, unreadable: error };
    }
    return { ...pin, commit: pin.pattern.exec(source)?.[1] };
  });
}

export function findSkillsCommitProblems(readPins) {
  const missing = readPins.filter((pin) => pin.commit === undefined);
  if (missing.length > 0) return { missing, mismatched: [] };

  const [first] = readPins;
  return {
    missing,
    mismatched: readPins.filter((pin) => pin.commit !== first.commit),
  };
}

export function runCheck(root = repoRoot) {
  const pins = readPinnedCommits(root);
  const { missing, mismatched } = findSkillsCommitProblems(pins);

  for (const pin of missing) {
    console.error(
      pin.unreadable
        ? `Could not read ${pin.file}: ${pin.unreadable.message}`
        : `Could not read a 40-character skills commit from ${pin.file}.`,
    );
  }

  if (mismatched.length > 0) {
    console.error("The assistant-ui/skills commit is pinned inconsistently:\n");
    for (const pin of pins) {
      console.error(`  ${pin.commit}  ${pin.file} (${pin.describes})`);
    }
    console.error(
      "\nSet every pin to one commit in the same change, or the CLI and the published snapshot serve different skills.",
    );
    for (const pin of pins) {
      if (pin.regenerateWith) {
        console.error(
          `${pin.file} moves only through \`${pin.regenerateWith}\`.`,
        );
      }
    }
  }

  if (missing.length > 0 || mismatched.length > 0) return false;

  console.log(
    `The assistant-ui/skills commit is pinned consistently across ${pins.length} files. (${pins[0].commit})`,
  );
  return true;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  if (!runCheck(process.env.SKILLS_COMMIT_CHECK_ROOT)) process.exit(1);
}
