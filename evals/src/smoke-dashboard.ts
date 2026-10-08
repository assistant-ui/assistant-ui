import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDashboardArtifact } from "./eval-report-adapter.ts";
import type { CaseResult } from "./types.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL(
    "./dist/cli/index.js",
    import.meta.resolve("@icodenet/eval-dashboards/package.json"),
  ),
);
const output = join(root, ".evals_output/smoke/run.json");
const reportDir = join(root, "results/eval-dashboard");
const result: CaseResult = {
  case: {
    id: "dashboard-smoke",
    description: "Synthetic adapter verification",
    task: "Render a safe report",
    rubric: "Keep evidence escaped",
    seed: [],
    inspect: [],
  },
  variants: [
    {
      candidate: { label: "baseline", prompt: "" },
      passRate: 0,
      trials: [
        {
          verdict: {
            pass: false,
            reason: "Synthetic expected baseline failure",
          },
          artifact: "<script>window.UNSAFE_EVAL_PAYLOAD=true</script>",
        },
      ],
    },
    {
      candidate: { label: "guided", prompt: "Escape evidence" },
      passRate: 1,
      trials: [
        {
          verdict: { pass: true, reason: "Synthetic candidate pass" },
          artifact: "safe output",
        },
      ],
    },
  ],
};
const report = createDashboardArtifact([result], {
  generatedAt: "2026-10-07T00:00:00.000Z",
});
report.run.project = "assistant-ui synthetic adapter smoke";
report.metadata = {
  fixture: true,
  description: "Synthetic verification only; not a measured model evaluation.",
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

function run(args: string[], expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  assert.equal(
    result.status,
    expected,
    `CLI exit status for ${args.join(" ")}`,
  );
}
run(["lint", `--input=${dirname(output)}`]);
run([
  "check",
  `--input=${dirname(output)}`,
  "--min-pass-rate=0",
  "--min-matched-expectation-rate=1",
]);
run([
  "report",
  `--input=${dirname(output)}`,
  "--reporter=html",
  "--reporter=json-summary",
  `--report-dir=${reportDir}`,
]);
const html = readFileSync(join(reportDir, "index.html"), "utf8");
assert.ok(html.includes("dashboard-smoke"));
assert.ok(!html.includes("<script>window.UNSAFE_EVAL_PAYLOAD=true</script>"));

result.variants[0]!.trials = [
  { error: true, message: "Synthetic timeout", artifact: "" },
];
writeFileSync(output, JSON.stringify(createDashboardArtifact([result])));
run(
  [
    "check",
    `--input=${dirname(output)}`,
    "--min-pass-rate=0",
    "--min-matched-expectation-rate=1",
  ],
  1,
);
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Synthetic end-to-end verification passed. HTML: ${reportDir}/index.html`,
);
