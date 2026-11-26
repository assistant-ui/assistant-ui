import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runClaude } from "./claude.ts";
import { judge, type Verdict } from "./judge.ts";
import { pool, positiveInt } from "./pool.ts";

export const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
/** The concept exam (apps/docs) owns the docs extractor and the reader prompts; this suite reuses them. */
const conceptExamDir = join(repoRoot, "apps/docs/evals/concept-exam");

export interface ExamSource {
  file: string;
  line: number | null;
  anchor: string;
}

export interface ExamQuestion {
  id: string;
  /** The reader-question topic it samples. */
  cluster: string;
  question: string;
  reference: string;
  keyPoints: string[];
  sources: ExamSource[];
}

export interface Exam {
  id: string;
  description: string;
  questions: ExamQuestion[];
}

export type Reader = "skim" | "deep";

export interface Answer {
  id: string;
  cluster: string;
  answer: string;
  /** Docs pages the reader opened successfully. */
  pages: string[];
  /** The skim reader opened more than its three pages. */
  overBudget: boolean;
  searches: string[];
  seconds: number;
  costUsd: number | null;
  /** The reader failed to run (timeout, CLI error); the question is left out of the score. */
  error?: string;
}

export interface GradedAnswer extends Answer {
  verdict?: Verdict;
  judgeCostUsd?: number | null;
  /** The judge failed or gave no valid JSON; the question is left out of the score. */
  judgeError?: string;
}

export interface ExamRun {
  exam: string;
  reader: Reader;
  model: string;
  judgeModel: string;
  /** What the docs were read from: a checkout's content/docs, or a folder given in DOCS_TEXT_DIR. */
  docs: string;
  startedAt: string;
  /** References whose cited code no longer contains the anchor, so they may be stale. */
  staleSources: { id: string; file: string; anchor: string }[];
  results: GradedAnswer[];
}

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

export function loadExams(): Record<string, Exam> {
  const heldout = readJson<{ questions: ExamQuestion[] }>(
    fileURLToPath(new URL("./questions.json", import.meta.url)),
  );
  const concept = readJson<{
    questions: (Omit<ExamQuestion, "cluster" | "sources"> & {
      concept: string;
    })[];
  }>(join(conceptExamDir, "questions.json"));
  return {
    heldout: {
      id: "heldout",
      description:
        "100 held-out questions sampled by real reader-question volume, references from the code",
      questions: heldout.questions,
    },
    concept: {
      id: "concept",
      description:
        "The concept exam's 38 questions (apps/docs/evals/concept-exam), which drove its fixes",
      questions: concept.questions.map((q) => ({
        ...q,
        cluster: q.concept,
        sources: [],
      })),
    },
  };
}

/** References whose anchor no longer appears in the cited file. */
export function findStaleSources(exam: Exam) {
  const stale: ExamRun["staleSources"] = [];
  const cache = new Map<string, string | null>();
  for (const q of exam.questions) {
    for (const s of q.sources) {
      if (!cache.has(s.file)) {
        const p = join(repoRoot, s.file);
        cache.set(s.file, existsSync(p) ? readFileSync(p, "utf8") : null);
      }
      if (!cache.get(s.file)?.includes(s.anchor)) {
        stale.push({ id: q.id, file: s.file, anchor: s.anchor });
      }
    }
  }
  return stale;
}

let docsText: { dir: string; label: string; owned: boolean } | undefined;

const extract = (out: string, content: string) =>
  execFileSync(
    process.execPath,
    [join(conceptExamDir, "extract.mjs"), out, content],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

/**
 * The docs as the reader sees them: one Markdown file per page plus INDEX.md
 * in sidebar order, extracted once per process from DOCS_CONTENT_DIR (another
 * checkout's apps/docs/content/docs) or this checkout. The Elements catalog
 * (content/elements, /elements on the site) is added under `elements/` with
 * its own INDEX section, since it is where the site answers "is there a
 * ready-made X"; DOCS_ELEMENTS=0 leaves it out, as the concept exam does.
 * DOCS_TEXT_DIR points at a folder extracted earlier instead.
 */
export function prepareDocs(): { dir: string; label: string } {
  if (docsText) return docsText;
  const given = process.env.DOCS_TEXT_DIR;
  if (given) {
    if (!existsSync(join(given, "INDEX.md"))) {
      throw new Error(`DOCS_TEXT_DIR has no INDEX.md: ${given}`);
    }
    docsText = {
      dir: realpathSync(given),
      label: resolve(given),
      owned: false,
    };
    return docsText;
  }
  const content = process.env.DOCS_CONTENT_DIR
    ? resolve(process.env.DOCS_CONTENT_DIR)
    : join(repoRoot, "apps/docs/content/docs");
  // The reader reports real paths (macOS tmpdir is a symlink), so pages must be relative to the real one.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "docs-exam-text-")));
  extract(dir, content);
  // A path inside this checkout is recorded relative to it, so a saved run names no local folders.
  const inRepo = relative(repoRoot, content);
  let label = inRepo.startsWith("..") ? content : inRepo;
  const elements = join(content, "../elements");
  if (process.env.DOCS_ELEMENTS !== "0" && existsSync(elements)) {
    const scratch = mkdtempSync(join(tmpdir(), "docs-exam-elements-"));
    extract(scratch, elements);
    // The extractor writes pages under docs/; the site serves these at /elements.
    renameSync(join(scratch, "docs"), join(dir, "elements"));
    const entries = readFileSync(join(scratch, "INDEX.md"), "utf8")
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => `  ${l.replace("](docs/", "](elements/")}`);
    appendFileSync(
      join(dir, "INDEX.md"),
      `\n- **Elements** (/elements: ready-made UI components)\n${entries.join("\n")}\n`,
    );
    rmSync(scratch, { recursive: true, force: true });
    label = `${label} + elements`;
  }
  docsText = { dir, label, owned: true };
  return docsText;
}

/** Removes the folder prepareDocs extracted itself; a DOCS_TEXT_DIR folder is never touched. */
export function cleanupDocs() {
  if (docsText?.owned) {
    rmSync(docsText.dir, { recursive: true, force: true });
  }
  docsText = undefined;
}

const readerPrompts = new Map<Reader, string>();
const readerPrompt = (reader: Reader) => {
  if (!readerPrompts.has(reader)) {
    readerPrompts.set(
      reader,
      readFileSync(join(conceptExamDir, `reader-${reader}.md`), "utf8"),
    );
  }
  return readerPrompts.get(reader)!;
};

export type StreamEvent = {
  type?: string;
  message?: {
    content?: {
      type: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string;
      is_error?: boolean;
    }[];
  };
};

/** The docs pages a reader opened successfully and the searches it ran, from its stream-json events. */
export function pagesRead(events: StreamEvent[], docsDir: string) {
  const pending = new Map<string, string>();
  const pages: string[] = [];
  const searches: string[] = [];
  for (const event of events) {
    for (const block of event.message?.content ?? []) {
      if (event.type === "assistant" && block.type === "tool_use") {
        const input = block.input ?? {};
        if (
          block.name === "Read" &&
          typeof input.file_path === "string" &&
          block.id
        ) {
          pending.set(
            block.id,
            relative(docsDir, resolve(docsDir, input.file_path)),
          );
        } else if (block.name === "Grep" || block.name === "Glob") {
          searches.push(`${block.name}: ${String(input.pattern ?? "")}`);
        }
      }
      // A page counts as read only once its Read succeeded.
      if (
        event.type === "user" &&
        block.type === "tool_result" &&
        !block.is_error &&
        block.tool_use_id
      ) {
        const rel = pending.get(block.tool_use_id);
        if (rel !== undefined && !pages.includes(rel)) pages.push(rel);
      }
    }
  }
  // INDEX.md is the sidebar, and Claude Code may reread its own saved copy of
  // a long tool result outside the folder; neither is a docs page.
  return {
    pages: pages.filter((p) => p !== "INDEX.md" && !p.startsWith("..")),
    searches,
  };
}

export async function askReader(
  q: ExamQuestion,
  reader: Reader,
  docsDir: string,
  model: string,
): Promise<Answer> {
  const base = {
    id: q.id,
    cluster: q.cluster,
    answer: "",
    pages: [] as string[],
    overBudget: false,
    searches: [] as string[],
    seconds: 0,
    costUsd: null,
  };
  try {
    // The skim reader opens pages it picks from INDEX.md and can't search.
    const tools = reader === "skim" ? "Read" : "Read,Grep,Glob";
    const run = await runClaude({
      prompt: q.question,
      systemPrompt: readerPrompt(reader),
      model,
      tools,
      cwd: docsDir,
      timeoutMs:
        positiveInt("READER_TIMEOUT_S", process.env.READER_TIMEOUT_S, 480) *
        1000,
    });
    const { pages, searches } = pagesRead(run.events as StreamEvent[], docsDir);
    return {
      ...base,
      answer: run.result,
      pages,
      // Flag a skim run that opened more than three pages rather than trust the prompt.
      overBudget: reader === "skim" && pages.length > 3,
      searches,
      seconds: run.seconds,
      costUsd: run.costUsd,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function grade(
  q: ExamQuestion,
  a: Answer,
  judgeModel: string,
): Promise<GradedAnswer> {
  if (a.error || !a.answer) return a;
  try {
    const { costUsd, ...verdict } = await judge(
      {
        question: q.question,
        reference: q.reference,
        keyPoints: q.keyPoints,
        answer: a.answer,
      },
      judgeModel,
    );
    return { ...a, verdict, judgeCostUsd: costUsd };
  } catch (e) {
    return { ...a, judgeError: e instanceof Error ? e.message : String(e) };
  }
}

export interface RunOptions {
  model?: string | undefined;
  judgeModel?: string | undefined;
  concurrency?: number | undefined;
  only?: Set<string> | undefined;
  onResult?: ((r: GradedAnswer) => void) | undefined;
}

/** Asks every question of a fresh reader, then has the judge grade each answer against its reference. */
export async function runExam(
  exam: Exam,
  reader: Reader,
  o: RunOptions = {},
): Promise<ExamRun> {
  const model = o.model ?? process.env.READER_MODEL ?? "sonnet";
  const judgeModel = o.judgeModel ?? process.env.JUDGE_MODEL ?? "sonnet";
  const docs = prepareDocs();
  const questions = exam.questions.filter((q) => !o.only || o.only.has(q.id));
  const startedAt = new Date().toISOString();
  const results = await pool(
    questions,
    o.concurrency ??
      positiveInt("EXAM_CONCURRENCY", process.env.EXAM_CONCURRENCY, 4),
    async (q) => {
      const graded = await grade(
        q,
        await askReader(q, reader, docs.dir, model),
        judgeModel,
      );
      o.onResult?.(graded);
      return graded;
    },
  );
  return {
    exam: exam.id,
    reader,
    model,
    judgeModel,
    docs: docs.label,
    startedAt,
    staleSources: findStaleSources(exam),
    results,
  };
}
