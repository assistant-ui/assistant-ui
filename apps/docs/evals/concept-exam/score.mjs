#!/usr/bin/env node
// Two jobs, both offline:
//   node score.mjs worksheet <answers.json>          prints a grading sheet
//   node score.mjs score <answers.json> <grades.json> prints the score
//
// A grade is one of: correct, partly, wrong, missing ("the docs don't say").
// grades.json maps question id -> { grade, note }. Grade each answer against
// the question's key points: correct when it states all of them and
// contradicts none, partly when it states some, wrong when it states
// something false about a key point, missing when the reader found nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const exam = JSON.parse(
  fs.readFileSync(path.join(here, "questions.json"), "utf8"),
);
const byId = new Map(exam.questions.map((q) => [q.id, q]));
const [mode, answersFile, gradesFile] = process.argv.slice(2);
const answers = JSON.parse(fs.readFileSync(answersFile, "utf8")).results;

if (mode === "worksheet") {
  for (const a of answers) {
    const q = byId.get(a.id);
    console.log(`## ${a.id} (${q.concept})\n\n**Q:** ${q.question}\n`);
    console.log(
      `**Key points:**\n${q.keyPoints.map((k) => `- ${k}`).join("\n")}\n`,
    );
    console.log(
      `**Answer:**\n\n${a.answer}\n\n**Pages read:** ${a.pages.join(", ") || "none"}\n`,
    );
  }
} else if (mode === "score") {
  const grades = JSON.parse(fs.readFileSync(gradesFile, "utf8"));
  const weight = { correct: 1, partly: 0.5, wrong: 0, missing: 0 };
  const counts = { correct: 0, partly: 0, wrong: 0, missing: 0 };
  const rows = [];
  for (const a of answers) {
    const g = grades[a.id];
    if (!g || !(g.grade in weight))
      throw new Error(`no valid grade for ${a.id}`);
    counts[g.grade]++;
    rows.push({
      id: a.id,
      concept: byId.get(a.id).concept,
      ...g,
      pages: a.pages,
    });
  }
  const n = rows.length;
  console.log(
    `Correct: ${counts.correct}/${n} (${Math.round((100 * counts.correct) / n)}%)`,
  );
  console.log(
    `Weighted (partly = 0.5): ${Math.round((100 * rows.reduce((s, r) => s + weight[r.grade], 0)) / n)}%`,
  );
  console.log(
    `partly ${counts.partly}, wrong ${counts.wrong}, docs don't say ${counts.missing}\n`,
  );
  for (const r of rows.filter((r) => r.grade !== "correct")) {
    console.log(`- ${r.id} ${r.concept}: ${r.grade}. ${r.note ?? ""}`);
  }
} else {
  console.error(
    "usage: node score.mjs worksheet <answers.json> | score <answers.json> <grades.json>",
  );
  process.exit(1);
}
