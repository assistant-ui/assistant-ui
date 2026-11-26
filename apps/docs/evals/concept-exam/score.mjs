#!/usr/bin/env node
// Three jobs, all offline:
//   node score.mjs worksheet <answers.json>          prints a grading sheet
//   node score.mjs score <answers.json> <grades.json> prints the score
//   node score.mjs gaps <answers.json>               counts the reader's hedges
//
// A grade is one of: correct, partly, wrong, missing ("the docs don't say").
// grades.json maps question id -> { grade, note }. Grade each answer against
// the question's key points: correct when it states all of them and
// contradicts none, partly when it states some, wrong when it states
// something false about a key point, missing when the reader found nothing.
//
// A reader that failed to run (non-zero exit, timeout, no answer) is an
// error, not a grade: it is listed and left out of every score.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEIGHT = { correct: 1, partly: 0.5, wrong: 0, missing: 0 };

// Sentences where the reader says the docs leave something out. Counting them
// needs no grader, so it is a check on the hand grades.
const HEDGE =
  /\b(docs|pages|page|guide)\b[^.]{0,80}\b(don't|do not|doesn't|does not|never)\s+(clearly\s+|explicitly\s+|fully\s+)?(say|explain|mention|cover|show|specify|list|define|describe|reconcile|detail)/i;

export const hedgesIn = (text) =>
  text.split(/(?<=[.!?])\s+/).filter((sentence) => HEDGE.test(sentence));

export const failed = (answer) =>
  (answer.exitCode !== undefined && answer.exitCode !== 0) ||
  !answer.answer?.trim();

/** Tallies the graded answers; failed runs are returned apart, unscored. */
export function score(answers, grades) {
  const errors = answers.filter(failed);
  const graded = answers.filter((a) => !failed(a));
  const counts = { correct: 0, partly: 0, wrong: 0, missing: 0 };
  for (const a of graded) {
    const g = grades[a.id];
    if (!g || !(g.grade in WEIGHT))
      throw new Error(`no valid grade for ${a.id}`);
    counts[g.grade]++;
  }
  const n = graded.length;
  const weighted = graded.reduce((s, a) => s + WEIGHT[grades[a.id].grade], 0);
  return {
    n,
    counts,
    correctShare: n ? counts.correct / n : 0,
    weightedShare: n ? weighted / n : 0,
    errors: errors.map((a) => a.id),
  };
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const exam = JSON.parse(
    fs.readFileSync(path.join(here, "questions.json"), "utf8"),
  );
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const [mode, answersFile, gradesFile] = process.argv.slice(2);
  const usage =
    "usage: node score.mjs worksheet <answers.json> | score <answers.json> <grades.json> | gaps <answers.json>";
  if (!answersFile || (mode === "score" && !gradesFile)) {
    console.error(usage);
    process.exit(1);
  }
  const answers = JSON.parse(fs.readFileSync(answersFile, "utf8")).results;
  if (!answers?.length) {
    console.error(`${answersFile} has no answers`);
    process.exit(1);
  }

  if (mode === "worksheet") {
    for (const a of answers) {
      const q = byId.get(a.id);
      console.log(`## ${a.id} (${q.concept})\n\n**Q:** ${q.question}\n`);
      console.log(
        `**Key points:**\n${q.keyPoints.map((k) => `- ${k}`).join("\n")}\n`,
      );
      if (failed(a)) {
        console.log(
          `**Reader failed** (exit ${a.exitCode}): ${a.error ?? "no answer"}\n`,
        );
        continue;
      }
      console.log(
        `**Answer:**\n\n${a.answer}\n\n**Pages read:** ${a.pages.join(", ") || "none"}${a.overBudget ? " (over the skim budget)" : ""}\n`,
      );
    }
  } else if (mode === "score") {
    const grades = JSON.parse(fs.readFileSync(gradesFile, "utf8"));
    const s = score(answers, grades);
    const pct = (x) => Math.round(100 * x);
    console.log(
      `Correct: ${s.counts.correct}/${s.n} (${pct(s.correctShare)}%)`,
    );
    console.log(`Weighted (partly = 0.5): ${pct(s.weightedShare)}%`);
    console.log(
      `partly ${s.counts.partly}, wrong ${s.counts.wrong}, docs don't say ${s.counts.missing}`,
    );
    if (s.errors.length)
      console.log(`reader failed, not scored: ${s.errors.join(", ")}`);
    console.log("");
    for (const a of answers) {
      const g = grades[a.id];
      if (failed(a) || g.grade === "correct") continue;
      console.log(
        `- ${a.id} ${byId.get(a.id).concept}: ${g.grade}. ${g.note ?? ""}`,
      );
    }
  } else if (mode === "gaps") {
    const ok = answers.filter((a) => !failed(a));
    let total = 0;
    let pages = 0;
    for (const a of ok) {
      const hedges = hedgesIn(a.answer);
      total += hedges.length;
      pages += a.pages.length;
      for (const h of hedges) console.log(`- ${a.id}: ${h}`);
    }
    console.log(
      `\n${total} hedges in ${ok.length} answers; ${(pages / ok.length).toFixed(1)} pages read per question`,
    );
  } else {
    console.error(usage);
    process.exit(1);
  }
}

const invoked = process.argv[1] && fs.realpathSync(process.argv[1]);
if (invoked === fileURLToPath(import.meta.url)) main();
