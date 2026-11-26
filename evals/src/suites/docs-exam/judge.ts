import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runClaude } from "./claude.ts";

export type Grade = "correct" | "partly" | "wrong";

export interface Verdict {
  grade: Grade;
  /** Key points the answer left out or got wrong. */
  missed: string[];
  /** The reader said the docs don't say something. */
  docsSilent: boolean;
  /** The reader's own sentences saying the docs contradict themselves. */
  conflicts: string[];
  reason: string;
}

export interface JudgeInput {
  question: string;
  reference: string;
  keyPoints: string[];
  answer: string;
}

const judgePrompt = readFileSync(
  new URL("./judge.md", import.meta.url),
  "utf8",
);

export const judgeMessage = (i: JudgeInput) =>
  [
    `Question:\n${i.question}`,
    `Reference answer (from the source code):\n${i.reference}`,
    `Key points:\n${i.keyPoints.map((k, n) => `${n + 1}. ${k}`).join("\n")}`,
    `Reader's answer:\n${i.answer}`,
  ].join("\n\n");

const GRADES = new Set<Grade>(["correct", "partly", "wrong"]);

/** Reads the judge's JSON reply; throws when it isn't one, so the trial is an error, not a grade. */
export function parseVerdict(text: string): Verdict {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`judge gave no JSON: ${text.slice(0, 200)}`);
  }
  const raw = JSON.parse(text.slice(start, end + 1)) as Partial<Verdict>;
  if (!raw.grade || !GRADES.has(raw.grade)) {
    throw new Error(`judge gave no valid grade: ${text.slice(0, 200)}`);
  }
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  return {
    grade: raw.grade,
    missed: strings(raw.missed),
    docsSilent: raw.docsSilent === true,
    conflicts: strings(raw.conflicts),
    reason: typeof raw.reason === "string" ? raw.reason : "",
  };
}

// The judge needs no files; it runs in an empty folder with no tools.
let emptyDir: string | undefined;

export async function judge(
  input: JudgeInput,
  model = process.env.JUDGE_MODEL ?? "sonnet",
): Promise<Verdict & { costUsd: number | null }> {
  emptyDir ??= mkdtempSync(join(tmpdir(), "docs-exam-judge-"));
  const run = await runClaude({
    prompt: judgeMessage(input),
    systemPrompt: judgePrompt,
    model,
    tools: "",
    cwd: emptyDir,
    timeoutMs: 180_000,
  });
  return { ...parseVerdict(run.result), costUsd: run.costUsd };
}
