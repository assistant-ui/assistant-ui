import { readFileSync } from "node:fs";
import type { Suite } from "../../types.ts";
import { runAgent } from "../comment-hygiene/agent.ts";
import { formatPassRate, passRate } from "../comment-hygiene/report.ts";
import type { Candidate, Judged } from "../comment-hygiene/types.ts";
import { cases, type QualityCase } from "./cases.ts";
import { verify } from "./verify.ts";

const guidance = ["SKILL.md", "tests.md", "mocking.md"]
  .map((name) =>
    readFileSync(
      new URL(
        `../../../../.claude/skills/test-quality/${name}`,
        import.meta.url,
      ),
      "utf8",
    ),
  )
  .join("\n\n");

export const testQuality: Suite<QualityCase, Candidate, Judged> = {
  id: "test-quality",
  cases,
  candidates: [
    { label: "baseline", prompt: "" },
    { label: "test-quality-guide", prompt: guidance },
  ],
  run(c, candidate) {
    const artifact = runAgent(
      {
        id: c.id,
        description: c.description,
        seed: [
          { path: "runtime.mjs", content: c.source },
          { path: "runtime.test.mjs", content: c.seedTest },
        ],
        task: `${c.task}\nEdit only runtime.test.mjs. This fixture uses node:test and node:assert/strict; run it with node --test runtime.test.mjs. Keep runtime.mjs unchanged and use no dependencies.`,
        rubric: "",
        inspect: ["runtime.test.mjs"],
      },
      candidate.prompt,
    );
    return { artifact, verdict: verify(c, artifact) };
  },
  view: ({ verdict, artifact }) => ({
    mark: verdict.pass ? "." : "x",
    verdict: `${verdict.pass ? "PASS" : "FAIL"}: ${verdict.reason}`,
    artifact,
  }),
  summarize: (trials) => formatPassRate(passRate(trials)),
  report(results) {
    const lines = [
      "# Test-quality guidance eval",
      "",
      "| Case | Candidate | Passed completed trials | Errors |",
      "| --- | --- | --- | --- |",
    ];
    for (const result of results) {
      for (const variant of result.variants) {
        lines.push(
          `| ${result.case.id} | ${variant.candidate.label} | ${formatPassRate(passRate(variant.trials))} | ${variant.trials.filter((t) => t.error).length} |`,
        );
      }
    }
    lines.push(
      "",
      "Synthetic fixture validation does not establish a model improvement. Compare repeated baseline and guided runs; preserve the notification-contract control in both.",
    );
    for (const result of results) {
      for (const variant of result.variants) {
        variant.trials.forEach((trial, index) => {
          lines.push(
            "",
            `## ${result.case.id} / ${variant.candidate.label} / ${index + 1}`,
            "",
          );
          if (trial.error) lines.push(`ERROR: ${trial.message}`);
          else
            lines.push(
              trial.outcome.verdict.reason,
              "",
              "```js",
              trial.outcome.artifact,
              "```",
            );
        });
      }
    }
    return lines.join("\n");
  },
};
