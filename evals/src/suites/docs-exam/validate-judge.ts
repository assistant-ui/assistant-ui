// Checks the judge against hand grades: the concept exam's recorded runs in
// apps/docs/evals/concept-exam/results, each graded by a person.
//
// node src/suites/docs-exam/validate-judge.ts [--set dev|test|all] [--out verdicts.json] [--concurrency 4]
//
// "dev" is results/first-pass (tune the judge prompt on it), "test" is the
// re-recorded results/ runs (check it there once), "all" is both.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { agreement, type HandGrade } from "./agreement.ts";
import { judge, type Verdict } from "./judge.ts";
import { pool, positiveInt } from "./pool.ts";

const examDir = fileURLToPath(
  new URL("../../../../apps/docs/evals/concept-exam/", import.meta.url),
);
const { values: args } = parseArgs({
  options: {
    set: { type: "string", default: "dev" },
    out: { type: "string" },
    concurrency: { type: "string", default: "4" },
    only: { type: "string" },
  },
});

const exam = JSON.parse(
  readFileSync(join(examDir, "questions.json"), "utf8"),
) as {
  questions: {
    id: string;
    question: string;
    reference: string;
    keyPoints: string[];
  }[];
};
const byId = new Map(exam.questions.map((q) => [q.id, q]));

if (!["dev", "test", "all"].includes(args.set!)) {
  throw new Error(`--set must be dev, test or all, got "${args.set}"`);
}
const runs = {
  dev: [
    "first-pass/before-deep",
    "first-pass/before-skim",
    "first-pass/after-deep",
    "first-pass/after-skim",
  ],
  test: ["before-deep", "before-skim", "after-deep", "after-skim"],
}[args.set === "test" ? "test" : "dev"]!;
const selected =
  args.set === "all"
    ? [
        "first-pass/before-deep",
        "first-pass/before-skim",
        "first-pass/after-deep",
        "first-pass/after-skim",
        "before-deep",
        "before-skim",
        "after-deep",
        "after-skim",
      ]
    : (args.only?.split(",") ?? runs);

interface Item {
  run: string;
  id: string;
  answer: string;
  hand: HandGrade;
  note?: string | undefined;
}
const items: Item[] = [];
for (const run of selected) {
  const answers = JSON.parse(
    readFileSync(join(examDir, "results", `${run}.json`), "utf8"),
  ) as { results: { id: string; answer: string }[] };
  const grades = JSON.parse(
    readFileSync(join(examDir, "results", `${run}-grades.json`), "utf8"),
  ) as Record<string, { grade: HandGrade; note?: string }>;
  for (const r of answers.results) {
    const g = grades[r.id];
    if (!g || !r.answer) continue;
    items.push({
      run,
      id: r.id,
      answer: r.answer,
      hand: g.grade,
      note: g.note,
    });
  }
}

console.log(
  `judging ${items.length} hand-graded answers from ${selected.join(", ")}`,
);
const verdicts = await pool(
  items,
  positiveInt("--concurrency", args.concurrency, 4),
  async (it) => {
    const q = byId.get(it.id)!;
    try {
      const v = await judge({
        question: q.question,
        reference: q.reference,
        keyPoints: q.keyPoints,
        answer: it.answer,
      });
      process.stdout.write(v.grade === "correct" ? "." : v.grade[0]!);
      return { ...it, judge: v as Verdict | null };
    } catch (e) {
      process.stdout.write("E");
      return { ...it, judge: null, error: String(e) };
    }
  },
);
console.log("");

const graded = verdicts.filter((v) => v.judge);
const a = agreement(
  graded.map((v) => ({ hand: v.hand, judge: v.judge!.grade })),
);
console.log(JSON.stringify(a, null, 2));
for (const v of graded) {
  const hand = v.hand === "missing" ? "wrong" : v.hand;
  if (hand !== v.judge!.grade) {
    console.log(
      `\n${v.run} ${v.id}: hand ${v.hand}${v.note ? ` (${v.note})` : ""} / judge ${v.judge!.grade}: ${v.judge!.reason}`,
    );
  }
}
if (args.out) {
  writeFileSync(args.out, JSON.stringify({ agreement: a, verdicts }, null, 2));
}
