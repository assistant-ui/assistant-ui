import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { agreement } from "./agreement.ts";
import { runClaude } from "./claude.ts";
import {
  type ExamRun,
  type GradedAnswer,
  loadExams,
  pagesRead,
} from "./exam.ts";
import { judgeMessage, parseVerdict } from "./judge.ts";
import { pool, positiveInt } from "./pool.ts";
import { gapsMarkdown, scoreRun } from "./score.ts";

describe("questions", () => {
  const { heldout, concept } = loadExams();

  it("has 100 held-out questions with unique ids, key points and cited sources", () => {
    assert.equal(heldout!.questions.length, 100);
    const ids = new Set(heldout!.questions.map((q) => q.id));
    assert.equal(ids.size, 100);
    for (const q of heldout!.questions) {
      assert.ok(q.question.endsWith("?"), `${q.id} is a question`);
      assert.ok(q.reference.length > 40, `${q.id} has a reference`);
      assert.ok(q.keyPoints.length >= 1, `${q.id} has key points`);
      assert.ok(q.cluster, `${q.id} has a topic`);
      assert.ok(q.sources.length >= 1, `${q.id} cites the code`);
      for (const s of q.sources) {
        assert.ok(
          s.file && s.anchor && Number.isInteger(s.line),
          `${q.id} cites file, line and anchor`,
        );
      }
    }
  });

  it("asks none of the concept exam's questions", () => {
    const seen = new Set(
      concept!.questions.map((q) => q.question.toLowerCase()),
    );
    for (const q of heldout!.questions) {
      assert.ok(
        !seen.has(q.question.toLowerCase()),
        `${q.id} repeats a concept question`,
      );
    }
  });
});

describe("judge", () => {
  it("reads the verdict out of surrounding text", () => {
    const v = parseVerdict(
      'Here you go:\n{"grade": "partly", "missed": ["x"], "docsSilent": true, "conflicts": ["Page A says one thing and page B another."], "reason": "r"}\n',
    );
    assert.deepEqual(v, {
      grade: "partly",
      missed: ["x"],
      docsSilent: true,
      conflicts: ["Page A says one thing and page B another."],
      reason: "r",
    });
  });

  it("defaults missing lists and flags", () => {
    const v = parseVerdict('{"grade": "correct"}');
    assert.deepEqual(v, {
      grade: "correct",
      missed: [],
      docsSilent: false,
      conflicts: [],
      reason: "",
    });
  });

  it("refuses a reply without a valid grade", () => {
    assert.throws(() => parseVerdict("no json here"));
    assert.throws(() => parseVerdict('{"grade": "missing"}'));
  });

  it("numbers the key points in the message", () => {
    const m = judgeMessage({
      question: "Q?",
      reference: "R",
      keyPoints: ["a", "b"],
      answer: "A",
    });
    assert.match(m, /Key points:\n1\. a\n2\. b/);
  });
});

describe("settings", () => {
  it("reads positive integers and refuses anything else", () => {
    assert.equal(positiveInt("X", undefined, 4), 4);
    assert.equal(positiveInt("X", "", 4), 4);
    assert.equal(positiveInt("X", "8", 4), 8);
    assert.throws(
      () => positiveInt("X", "abc", 4),
      /X must be a positive integer/,
    );
    assert.throws(() => positiveInt("X", "0", 4));
    assert.throws(() => positiveInt("X", "1.5", 4));
  });

  it("pool refuses a concurrency that would start no workers", async () => {
    await assert.rejects(pool([1], Number.NaN, async (x) => x));
    assert.deepEqual(await pool([1, 2, 3], 2, async (x) => x * 2), [2, 4, 6]);
  });
});

describe("agreement", () => {
  it("refuses an empty comparison instead of reporting perfect agreement", () => {
    assert.throws(() => agreement([]), /no graded answers/);
  });

  it("counts exact and correct-vs-not agreement and kappa", () => {
    const a = agreement([
      { hand: "correct", judge: "correct" },
      { hand: "correct", judge: "correct" },
      { hand: "partly", judge: "partly" },
      { hand: "partly", judge: "wrong" },
      { hand: "missing", judge: "wrong" },
      { hand: "correct", judge: "partly" },
    ]);
    assert.equal(a.n, 6);
    assert.equal(a.exact, 4 / 6);
    assert.equal(a.correctVsNot, 5 / 6);
    assert.equal(a.notCorrectRecall, 1);
    assert.equal(a.notCorrectPrecision, 3 / 4);
    // pe = (3/6)(4/6) + (3/6)(2/6) = 0.5; kappa = (5/6 - 0.5) / 0.5
    assert.ok(Math.abs(a.kappa - 2 / 3) < 1e-9);
    assert.deepEqual(a.confusion.wrong, { wrong: 1 });
  });
});

const answer = (over: Partial<GradedAnswer>): GradedAnswer => ({
  id: "h001",
  cluster: "setup",
  answer: "text",
  pages: ["docs/cli.md"],
  overBudget: false,
  searches: [],
  seconds: 5,
  costUsd: 0.1,
  ...over,
});

describe("score", () => {
  const results: GradedAnswer[] = [
    answer({
      id: "h001",
      verdict: {
        grade: "correct",
        missed: [],
        docsSilent: false,
        conflicts: [],
        reason: "",
      },
    }),
    answer({
      id: "h002",
      pages: ["docs/a.md", "docs/b.md", "docs/c.md"],
      verdict: {
        grade: "partly",
        missed: ["the default"],
        docsSilent: true,
        conflicts: ["The CLI page says X, but the install page says Y."],
        reason: "",
      },
    }),
    answer({ id: "h003", pages: [], error: "claude exited 1" }),
    answer({ id: "h004", judgeError: "judge gave no JSON" }),
  ];

  it("leaves reader and judge failures out of the shares", () => {
    const s = scoreRun(results);
    assert.equal(s.graded, 2);
    assert.equal(s.errors, 2);
    assert.equal(s.correctShare, 0.5);
    assert.equal(s.weightedShare, 0.75);
    assert.equal(s.docsSilent, 1);
    assert.equal(s.conflicts, 1);
    // Pages count every answered question, judged or not.
    assert.equal(s.pagesPerQuestion, 5 / 3);
  });

  it("lists conflict sentences, missed key points and stale references for a person", () => {
    const run: ExamRun = {
      exam: "heldout",
      reader: "skim",
      model: "sonnet",
      judgeModel: "sonnet",
      docs: "content/docs",
      startedAt: "2026-11-26T00:00:00.000Z",
      staleSources: [{ id: "h009", file: "packages/x.ts", anchor: "gone()" }],
      results,
    };
    const md = gapsMarkdown(run, loadExams().heldout!.questions);
    assert.match(
      md,
      /- \[ \] \*\*h002\*\* \(setup\): "The CLI page says X, but the install page says Y\."/,
    );
    assert.match(
      md,
      /\*\*h002\*\* \(setup, partly\): .* Missed: the default\. The reader said the docs don't say\./,
    );
    assert.doesNotMatch(md, /\*\*h001\*\*/);
    assert.match(md, /h009: `gone\(\)` is no longer in packages\/x\.ts/);
  });
});

describe("pagesRead", () => {
  it("counts successful reads of docs pages only", () => {
    const events = [
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "1",
              name: "Read",
              input: { file_path: "/d/INDEX.md" },
            },
            {
              type: "tool_use",
              id: "2",
              name: "Read",
              input: { file_path: "/d/docs/cli.md" },
            },
            {
              type: "tool_use",
              id: "3",
              name: "Read",
              input: { file_path: "/d/docs/missing.md" },
            },
            {
              type: "tool_use",
              id: "4",
              name: "Read",
              input: { file_path: "/elsewhere/tool-result.txt" },
            },
            {
              type: "tool_use",
              id: "5",
              name: "Grep",
              input: { pattern: "runtime" },
            },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [
            { type: "tool_result", tool_use_id: "1" },
            { type: "tool_result", tool_use_id: "2" },
            { type: "tool_result", tool_use_id: "3", is_error: true },
            { type: "tool_result", tool_use_id: "4" },
          ],
        },
      },
    ];
    assert.deepEqual(pagesRead(events, "/d"), {
      pages: ["docs/cli.md"],
      searches: ["Grep: runtime"],
    });
  });
});

describe("runClaude with a fake CLI", () => {
  const dir = mkdtempSync(join(tmpdir(), "docs-exam-fake-cli-"));
  const fake = (name: string, body: string) => {
    const file = join(dir, name);
    writeFileSync(file, `#!/bin/sh\n${body}\n`);
    chmodSync(file, 0o755);
    return file;
  };
  const call = (bin: string, timeoutMs = 10_000) => {
    process.env.CLAUDE_BIN = bin;
    return runClaude({
      prompt: "q",
      systemPrompt: "s",
      model: "m",
      tools: "Read",
      cwd: dir,
      timeoutMs,
    });
  };

  it("returns the result event's text and cost", async () => {
    const bin = fake(
      "ok",
      `echo '{"type":"assistant","message":{"content":[]}}'; echo '{"type":"result","result":" hi ","total_cost_usd":0.25}'`,
    );
    const run = await call(bin);
    assert.equal(run.result, "hi");
    assert.equal(run.costUsd, 0.25);
    assert.equal(run.events.length, 2);
  });

  it("rejects a non-zero exit with its stderr", async () => {
    await assert.rejects(
      call(fake("fail", "echo boom >&2; exit 3")),
      /exited 3: boom/,
    );
  });

  it("rejects an error result even on exit 0", async () => {
    const bin = fake(
      "err",
      `echo '{"type":"result","is_error":true,"result":"rate limited"}'`,
    );
    await assert.rejects(call(bin), /error result: rate limited/);
  });

  it("stops a reader at the deadline", async () => {
    const started = Date.now();
    await assert.rejects(
      call(fake("hang", "sleep 30"), 300),
      /timed out after 300 ms/,
    );
    assert.ok(
      Date.now() - started < 4_000,
      "a reader that obeys SIGTERM stops at once",
    );
  });

  it("cleans up", () => {
    delete process.env.CLAUDE_BIN;
    rmSync(dir, { recursive: true, force: true });
  });
});
