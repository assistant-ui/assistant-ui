import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tasks } from "./tasks.ts";

// `node src/suites/agent-docs/score.ts [label...]`: the score table across every saved trial, by task and docs label.
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "..", "..", "results", "agent-docs", "trials");
const only = process.argv.slice(2);

interface Trial {
  task: string;
  label: string;
  pass: boolean;
  failedStep?: string;
  mode?: string;
  agentSeconds: number;
  answerSeconds?: number | null;
  turns: number;
  docsRead: string[];
  nodeModulesLookups: number;
}

const trials: Trial[] = existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Trial)
      .filter((t) => only.length === 0 || only.includes(t.label))
  : [];
// One column per label and docs mode, so two modes run under the same label stay apart.
const arm = (t: Trial) => `${t.label} (${t.mode ?? "local"})`;
const labels = [...new Set(trials.map(arm))];

const cell = (list: Trial[]) => {
  if (list.length === 0) return "–";
  const passed = list.filter((t) => t.pass).length;
  const minutes = Math.round(
    list.reduce((sum, t) => sum + (t.answerSeconds ?? t.agentSeconds), 0) /
      list.length /
      60,
  );
  const failed = list.find((t) => !t.pass)?.failedStep;
  return `${passed}/${list.length} (${minutes} min)${failed ? ` ✗ ${failed}` : ""}`;
};

const lines = [
  `| Task | ${labels.join(" | ")} |`,
  `| --- | ${labels.map(() => "---").join(" | ")} |`,
];
for (const task of tasks) {
  const row = labels.map((label) =>
    cell(trials.filter((t) => t.task === task.id && arm(t) === label)),
  );
  lines.push(`| ${task.id} | ${row.join(" | ")} |`);
}
const totals = labels.map((label) => {
  const list = trials.filter((t) => arm(t) === label);
  const passed = list.filter((t) => t.pass).length;
  return `**${passed}/${list.length}**`;
});
lines.push(`| **all** | ${totals.join(" | ")} |`);
console.log(lines.join("\n"));

const pages = new Map<string, number>();
for (const t of trials) {
  for (const page of t.docsRead ?? [])
    pages.set(page, (pages.get(page) ?? 0) + 1);
}
console.log("\nMost-read docs pages:");
for (const [page, n] of [...pages].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${n}  ${page}`);
}
const lookups = trials.reduce((sum, t) => sum + (t.nodeModulesLookups ?? 0), 0);
console.log(
  `\nLookups in node_modules (the docs didn't answer): ${lookups} across ${trials.length} trials`,
);
