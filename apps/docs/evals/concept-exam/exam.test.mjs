import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mdxToText, safeToReplace } from "./extract.mjs";
import { failed, hedgesIn, score } from "./score.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const exam = JSON.parse(
  fs.readFileSync(path.join(here, "questions.json"), "utf8"),
);

describe("questions.json", () => {
  it("holds 25 to 40 questions, each with a reference and key points", () => {
    expect(exam.questions.length).toBeGreaterThanOrEqual(25);
    expect(exam.questions.length).toBeLessThanOrEqual(40);
    const ids = exam.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of exam.questions) {
      expect(q.question.trim()).not.toBe("");
      expect(q.reference.trim()).not.toBe("");
      expect(Array.isArray(q.keyPoints)).toBe(true);
      expect(q.keyPoints.length).toBeGreaterThan(0);
      for (const keyPoint of q.keyPoints) {
        expect(typeof keyPoint).toBe("string");
        expect(keyPoint.trim()).not.toBe("");
      }
    }
  });
});

describe("mdxToText", () => {
  const page = [
    "---",
    "title: Runtime",
    'description: "What the runtime does: state and runs."',
    "---",
    'import { Foo } from "./foo";',
    "import {",
    "  Bar,",
    '} from "./bar";',
    "export const meta = { a: 1 };",
    "export type Props = { a: number };",
    "",
    "{/* a note for authors */}",
    "export for a toolkit, the schema stays on the server.",
    "",
    "<Flow.Root llm={`graph LR\n  A --> B`}>",
    "  <Flow.Row />",
    "</Flow.Root>",
    "",
    "```ts",
    'import { useAui } from "@assistant-ui/react";',
    "```",
  ].join("\n");
  const { title, description, text } = mdxToText(page);

  it("reads the title and a quoted description with a colon", () => {
    expect(title).toBe("Runtime");
    expect(description).toBe("What the runtime does: state and runs.");
  });

  it("drops ESM statements and MDX comments but keeps prose and code", () => {
    expect(text).not.toContain("./foo");
    expect(text).not.toContain("Bar,");
    expect(text).not.toContain("meta =");
    expect(text).not.toContain("type Props");
    expect(text).not.toContain("a note for authors");
    expect(text).toContain("export for a toolkit, the schema stays");
    expect(text).toContain('import { useAui } from "@assistant-ui/react";');
  });

  it("swaps a Flow diagram for its text version", () => {
    expect(text).toContain("```mermaid\ngraph LR\n  A --> B\n```");
    expect(text).not.toContain("Flow.Row");
  });
});

describe("safeToReplace", () => {
  it("refuses the exam folder and folders it didn't write", () => {
    expect(safeToReplace(here)).toBe(false);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "concept-exam-"));
    try {
      expect(safeToReplace(tmp)).toBe(true);
      expect(safeToReplace(path.join(tmp, "missing"))).toBe(true);
      fs.writeFileSync(path.join(tmp, "notes.txt"), "keep me");
      expect(safeToReplace(tmp)).toBe(false);
      fs.writeFileSync(path.join(tmp, "INDEX.md"), "# docs");
      expect(safeToReplace(tmp)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("score", () => {
  const answers = [
    { id: "q01", answer: "A runtime holds state.", exitCode: 0, pages: [] },
    { id: "q02", answer: "Use useChatRuntime.", exitCode: 0, pages: [] },
    { id: "q03", answer: "", exitCode: 143, pages: [] },
  ];
  const grades = {
    q01: { grade: "correct" },
    q02: { grade: "partly" },
  };

  it("leaves failed runs out of the score", () => {
    expect(failed(answers[2])).toBe(true);
    const s = score(answers, grades);
    expect(s.n).toBe(2);
    expect(s.errors).toEqual(["q03"]);
    expect(s.correctShare).toBe(0.5);
    expect(s.weightedShare).toBe(0.75);
  });

  it("throws when a graded answer has no grade", () => {
    expect(() => score(answers, { q01: { grade: "correct" } })).toThrow(
      "no valid grade for q02",
    );
  });

  it("counts the sentences where the reader says the docs leave a gap", () => {
    expect(
      hedgesIn(
        "Use cancelRun. The docs don't say whether partial text stays. It ends incomplete.",
      ),
    ).toEqual(["The docs don't say whether partial text stays."]);
  });
});
