import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Suite,
  SuiteCandidate,
  SuiteCase,
  TrialResult,
} from "../../types.ts";
import {
  type Exam,
  type ExamRun,
  type Reader,
  cleanupDocs,
  loadExams,
  runExam,
} from "./exam.ts";
import {
  type ExamScore,
  clusterTable,
  gapsMarkdown,
  scoreLine,
  scoreRun,
  scoreTable,
} from "./score.ts";

interface ExamCase extends SuiteCase {
  exam: Exam;
}

interface ReaderCandidate extends SuiteCandidate {
  reader: Reader;
}

interface ExamOutcome {
  run: ExamRun;
  score: ExamScore;
  /** Where the run's answers and its findings list were written. */
  files: { run: string; gaps: string };
}

const resultsDir = fileURLToPath(
  new URL("../../../results/docs-exam/", import.meta.url),
);

const exams = loadExams();

/**
 * One trial is a whole exam: every question asked of a fresh reader and graded
 * by the judge. The questions of a trial run in parallel (EXAM_CONCURRENCY,
 * default 4), so run this suite with TRIALS=1.
 */
export const docsExam: Suite<ExamCase, ReaderCandidate, ExamOutcome> = {
  id: "docs-exam",
  cases: Object.values(exams).map((exam) => ({
    id: exam.id,
    description: exam.description,
    exam,
  })),
  candidates: [
    { label: "skim", reader: "skim" },
    { label: "deep", reader: "deep" },
  ],
  async run(c, candidate) {
    const run = await runExam(c.exam, candidate.reader);
    const score = scoreRun(run.results);
    if (score.graded === 0) {
      throw new Error(
        `no question was graded: ${run.results.find((r) => r.error || r.judgeError)?.error ?? "see the run file"}`,
      );
    }
    const stamp = run.startedAt.replace(/[:.]/g, "-");
    const dir = join(resultsDir, "runs");
    mkdirSync(dir, { recursive: true });
    const base = join(dir, `${c.id}--${candidate.label}--${stamp}`);
    const files = { run: `${base}.json`, gaps: `${base}.gaps.md` };
    writeFileSync(files.run, `${JSON.stringify(run, null, 2)}\n`);
    writeFileSync(files.gaps, gapsMarkdown(run, c.exam.questions));
    return { run, score, files };
  },
  view(o) {
    return {
      mark: ` ${Math.round(o.score.correctShare * 100)}%`,
      verdict: scoreLine(o.score),
      artifact: `answers: ${o.files.run}\nfindings: ${o.files.gaps}`,
    };
  },
  summarize(trials: TrialResult<ExamOutcome>[]) {
    const done = trials.filter((t) => !t.error).map((t) => t.outcome);
    if (!done.length) return "no completed trial";
    return done.map((o) => scoreLine(o.score)).join(" | ");
  },
  close() {
    cleanupDocs();
  },
  report(results) {
    const rows: { label: string; score: ExamScore }[] = [];
    const sections: string[] = [];
    for (const r of results) {
      for (const v of r.variants) {
        for (const [i, t] of v.trials.entries()) {
          if (t.error) continue;
          const label = `${r.case.id} / ${v.candidate.label}${v.trials.length > 1 ? ` #${i + 1}` : ""}`;
          rows.push({ label, score: t.outcome.score });
          sections.push(
            `### ${label}\n\n${clusterTable(t.outcome.run.results)}\n\nAnswers: \`${t.outcome.files.run}\`\nFindings to turn into cards: \`${t.outcome.files.gaps}\`${t.outcome.run.staleSources.length ? `\n\n${t.outcome.run.staleSources.length} reference(s) cite code that changed; see the findings file.` : ""}`,
          );
        }
      }
    }
    return [
      "# docs-exam",
      "",
      "Can a reader who sees only the human docs answer what developers ask? Each answer is graded by an LLM judge against a reference written from the source.",
      "",
      scoreTable(rows),
      "",
      ...sections,
    ].join("\n");
  },
};
