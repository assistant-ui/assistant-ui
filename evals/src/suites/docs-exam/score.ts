import type { ExamQuestion, ExamRun, GradedAnswer } from "./exam.ts";

export interface ExamScore {
  /** Questions with an answer and a grade. */
  graded: number;
  /** Questions the reader or the judge failed on; left out of every share. */
  errors: number;
  correct: number;
  partly: number;
  wrong: number;
  /** correct / graded */
  correctShare: number;
  /** (correct + partly / 2) / graded */
  weightedShare: number;
  /** Answers where the reader said the docs don't say something. */
  docsSilent: number;
  /** Sentences where the reader said the docs contradict themselves. */
  conflicts: number;
  pagesPerQuestion: number;
  overBudget: number;
  /** Reader plus judge cost as Claude Code reports it, when it does. */
  costUsd: number;
}

const isGraded = (r: GradedAnswer) => !r.error && !r.judgeError && !!r.verdict;

export function scoreRun(results: GradedAnswer[]): ExamScore {
  const graded = results.filter(isGraded);
  const count = (g: string) =>
    graded.filter((r) => r.verdict!.grade === g).length;
  const correct = count("correct");
  const partly = count("partly");
  const n = graded.length;
  const answered = results.filter((r) => !r.error && r.answer);
  return {
    graded: n,
    errors: results.length - n,
    correct,
    partly,
    wrong: count("wrong"),
    correctShare: n ? correct / n : 0,
    weightedShare: n ? (correct + partly / 2) / n : 0,
    docsSilent: graded.filter((r) => r.verdict!.docsSilent).length,
    conflicts: graded.reduce((s, r) => s + r.verdict!.conflicts.length, 0),
    pagesPerQuestion: answered.length
      ? answered.reduce((s, r) => s + r.pages.length, 0) / answered.length
      : 0,
    overBudget: results.filter((r) => r.overBudget).length,
    costUsd: results.reduce(
      (s, r) => s + (r.costUsd ?? 0) + (r.judgeCostUsd ?? 0),
      0,
    ),
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function scoreLine(s: ExamScore) {
  return `${s.correct}/${s.graded} correct (${pct(s.correctShare)}), ${s.partly} partly, ${s.wrong} wrong, docs silent ${s.docsSilent}, conflicts ${s.conflicts}, ${s.pagesPerQuestion.toFixed(1)} pages/question${s.overBudget ? `, ${s.overBudget} over budget` : ""}${s.errors ? `, ${s.errors} errors` : ""}`;
}

export function scoreTable(rows: { label: string; score: ExamScore }[]) {
  const lines = [
    "| Run | Correct | Partly | Wrong | Docs don't say | Conflicts | Pages per question | Errors |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const { label, score: s } of rows) {
    lines.push(
      `| ${label} | ${s.correct}/${s.graded} (${pct(s.correctShare)}) | ${s.partly} | ${s.wrong} | ${s.docsSilent} | ${s.conflicts} | ${s.pagesPerQuestion.toFixed(1)} | ${s.errors} |`,
    );
  }
  return lines.join("\n");
}

/** Correct share per reader-question topic, worst first. */
export function clusterTable(results: GradedAnswer[]) {
  const by = new Map<string, GradedAnswer[]>();
  for (const r of results.filter(isGraded)) {
    by.set(r.cluster, [...(by.get(r.cluster) ?? []), r]);
  }
  const rows = [...by.entries()]
    .map(([cluster, rs]) => ({
      cluster,
      n: rs.length,
      correct: rs.filter((r) => r.verdict!.grade === "correct").length,
      silent: rs.filter((r) => r.verdict!.docsSilent).length,
    }))
    .sort((a, b) => a.correct / a.n - b.correct / b.n || b.n - a.n);
  return [
    "| Topic | Questions | Correct | Docs don't say |",
    "| --- | --- | --- | --- |",
    ...rows.map(
      (r) => `| ${r.cluster} | ${r.n} | ${r.correct} | ${r.silent} |`,
    ),
  ].join("\n");
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The run's findings for a person to turn into cards: every sentence where the
 * reader said the docs contradict themselves, then every answer that missed a
 * key point, with what it missed and the pages it read. Nothing here files a
 * card on its own.
 */
export function gapsMarkdown(run: ExamRun, questions: ExamQuestion[]) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const graded = run.results.filter(isGraded);
  const out: string[] = [
    `# Docs exam findings: ${run.exam}, ${run.reader} reader`,
    "",
    `Run ${run.startedAt} on ${run.docs}; reader ${run.model}, judge ${run.judgeModel}. ${scoreLine(scoreRun(run.results))}.`,
    "",
    "## The reader says the docs conflict",
    "",
  ];
  const conflicts = graded.filter((r) => r.verdict!.conflicts.length);
  if (!conflicts.length) out.push("None this run.", "");
  for (const r of conflicts) {
    for (const sentence of r.verdict!.conflicts) {
      out.push(
        `- [ ] **${r.id}** (${r.cluster}): "${oneLine(sentence)}" Pages read: ${r.pages.join(", ") || "none"}. Question: ${byId.get(r.id)?.question}`,
      );
    }
  }
  out.push("", "## Answers that missed a key point", "");
  const missed = graded.filter((r) => r.verdict!.grade !== "correct");
  if (!missed.length) out.push("None this run.");
  for (const r of missed) {
    const silent = r.verdict!.docsSilent
      ? " The reader said the docs don't say."
      : "";
    out.push(
      `- [ ] **${r.id}** (${r.cluster}, ${r.verdict!.grade}): ${byId.get(r.id)?.question} Missed: ${r.verdict!.missed.map(oneLine).join("; ") || oneLine(r.verdict!.reason)}.${silent} Pages read: ${r.pages.join(", ") || "none"}.`,
    );
  }
  if (run.staleSources.length) {
    out.push("", "## References that may be stale", "");
    for (const s of run.staleSources) {
      out.push(`- ${s.id}: \`${s.anchor}\` is no longer in ${s.file}`);
    }
  }
  return `${out.join("\n")}\n`;
}
