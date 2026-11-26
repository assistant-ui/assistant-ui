// One exam run outside the A/B runner, or a regrade of saved answers.
//
// node src/suites/docs-exam/run-exam.ts --exam heldout --reader skim --out run.json [--only h001,h002]
// node src/suites/docs-exam/run-exam.ts --regrade run.json --out regraded.json [--only h031]
//
// Writes the run as JSON and, next to it, <name>.gaps.md: the reader's "the
// docs conflict" sentences and the answers that missed a key point, for a
// person to turn into cards. Exits non-zero when no question was graded (a
// missing CLI or a refused key fails every question).
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  type ExamRun,
  type Reader,
  cleanupDocs,
  findStaleSources,
  grade,
  loadExams,
  runExam,
} from "./exam.ts";
import { pool, positiveInt } from "./pool.ts";
import { clusterTable, gapsMarkdown, scoreLine, scoreRun } from "./score.ts";

const { values: args } = parseArgs({
  options: {
    exam: { type: "string", default: "heldout" },
    reader: { type: "string", default: "skim" },
    out: { type: "string" },
    only: { type: "string" },
    regrade: { type: "string" },
    concurrency: { type: "string" },
  },
});
if (!args.out) throw new Error("--out <file.json> is required");
const exams = loadExams();
const concurrency = positiveInt(
  args.concurrency === undefined ? "EXAM_CONCURRENCY" : "--concurrency",
  args.concurrency ?? process.env.EXAM_CONCURRENCY,
  4,
);
/** --only, checked against the exam so a typo can't silently select nothing. */
const onlyIds = (ids: string[]) => {
  if (args.only === undefined) return undefined;
  const only = new Set(args.only.split(",").filter(Boolean));
  const unknown = [...only].filter((id) => !ids.includes(id));
  if (unknown.length || only.size === 0) {
    throw new Error(
      `--only names no question of this exam: ${unknown.join(", ") || "(empty)"}`,
    );
  }
  return only;
};

let run: ExamRun;
if (args.regrade) {
  const saved = JSON.parse(readFileSync(args.regrade, "utf8")) as ExamRun;
  const exam = exams[saved.exam];
  if (!exam) throw new Error(`unknown exam ${saved.exam}`);
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const judgeModel = process.env.JUDGE_MODEL ?? "sonnet";
  // --only regrades those questions (after their key points changed, say) and keeps the other verdicts.
  const only = onlyIds(saved.results.map((r) => r.id));
  const results = await pool(saved.results, concurrency, async (r) => {
    if (only && !only.has(r.id)) return r;
    const { verdict: _v, judgeError: _e, judgeCostUsd: _c, ...answer } = r;
    const g = await grade(byId.get(r.id)!, answer, judgeModel);
    process.stdout.write(g.verdict ? g.verdict.grade[0]! : "E");
    return g;
  });
  run = {
    ...saved,
    judgeModel,
    staleSources: findStaleSources(exam),
    results,
  };
} else {
  const exam = exams[args.exam!];
  if (!exam) {
    throw new Error(`--exam must be one of ${Object.keys(exams).join(", ")}`);
  }
  if (args.reader !== "skim" && args.reader !== "deep") {
    throw new Error("--reader must be skim or deep");
  }
  run = await runExam(exam, args.reader as Reader, {
    concurrency,
    only: onlyIds(exam.questions.map((q) => q.id)),
    onResult: (r) => {
      process.stdout.write(
        `${r.id} ${r.error ? "reader-error" : (r.verdict?.grade ?? "judge-error")} ${r.seconds}s pages=${r.pages.length}${r.overBudget ? " over-budget" : ""}\n`,
      );
    },
  });
  cleanupDocs();
}
console.log("");
writeFileSync(args.out, `${JSON.stringify(run, null, 2)}\n`);
const gapsFile = args.out.replace(/\.json$/, "") + ".gaps.md";
writeFileSync(gapsFile, gapsMarkdown(run, exams[run.exam]!.questions));
console.log(scoreLine(scoreRun(run.results)));
console.log(clusterTable(run.results));
console.log(`run -> ${args.out}\nfindings -> ${gapsFile}`);
if (scoreRun(run.results).graded === 0) {
  console.error("No question was graded; see the errors in the run file.");
  process.exitCode = 1;
}
