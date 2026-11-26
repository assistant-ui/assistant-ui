#!/usr/bin/env node
// Asks every exam question of a fresh headless reader that can see only the
// extracted docs (see extract.mjs), and records its answer and the pages it read.
//
// Usage: node run.mjs --docs <extracted-dir> --out <answers.json>
//          [--reader deep|skim] [--model sonnet] [--concurrency 6] [--timeout 480] [--only q01,q02]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = path.dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    docs: { type: "string" },
    out: { type: "string" },
    model: { type: "string", default: "sonnet" },
    concurrency: { type: "string", default: "6" },
    timeout: { type: "string", default: "480" },
    only: { type: "string" },
    reader: { type: "string", default: "deep" },
  },
});
const docsDir = path.resolve(args.docs ?? path.join(here, ".docs-text"));
const outFile = path.resolve(args.out ?? path.join(here, "answers.json"));
const model = args.model;
const concurrency = Number(args.concurrency);
const timeoutMs = Number(args.timeout) * 1000;
const only = args.only ? new Set(args.only.split(",")) : null;

const exam = JSON.parse(
  fs.readFileSync(path.join(here, "questions.json"), "utf8"),
);
// "deep" reads as many pages as it likes; "skim" reads at most three, like a
// developer who opens a few pages to get the idea before briefing an agent.
const systemPrompt = fs.readFileSync(
  path.join(here, `reader-${args.reader}.md`),
  "utf8",
);
const questions = exam.questions.filter((q) => !only || only.has(q.id));

// The skim reader can only open pages it picks from INDEX.md; it can't search.
const tools = args.reader === "skim" ? "Read" : "Read,Grep,Glob";

// The reader inherits nothing from this shell's agent session.
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([k]) => !/^(CLAUDE|ANTHROPIC_SESSION)/.test(k),
  ),
);

function ask(question) {
  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      [
        "-p",
        question.question,
        "--model",
        model,
        "--system-prompt",
        systemPrompt,
        "--tools",
        tools,
        "--allowedTools",
        tools,
        "--restricted",
        "--safe-mode",
        "--strict-mcp-config",
        "--no-session-persistence",
        "--permission-prompts",
        "none",
        "--output-format",
        "stream-json",
        "--verbose",
      ],
      { cwd: docsDir, env, stdio: ["ignore", "pipe", "pipe"] },
    );
    fs.appendFileSync(`${outFile}.pids`, `${child.pid} ${question.id}\n`);
    const started = Date.now();
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      const pages = [];
      const searches = [];
      let answer = "";
      let cost = null;
      for (const line of out.split("\n")) {
        if (!line.trim()) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === "assistant") {
          for (const block of event.message?.content ?? []) {
            if (block.type !== "tool_use") continue;
            const input = block.input ?? {};
            if (block.name === "Read" && input.file_path) {
              const rel = path.relative(
                docsDir,
                path.resolve(docsDir, input.file_path),
              );
              if (!pages.includes(rel)) pages.push(rel);
            } else if (block.name === "Grep" || block.name === "Glob") {
              searches.push(`${block.name}: ${input.pattern ?? ""}`);
            }
          }
        }
        if (event.type === "result") {
          answer = event.result ?? "";
          cost = event.total_cost_usd ?? null;
        }
      }
      resolve({
        id: question.id,
        concept: question.concept,
        question: question.question,
        answer: answer.trim(),
        // Claude Code can also reread its own saved copy of a long tool result,
        // which lives outside the docs folder; only docs pages count.
        pages: pages.filter((p) => p !== "INDEX.md" && !p.startsWith("..")),
        searches,
        seconds: Math.round((Date.now() - started) / 1000),
        exitCode: code,
        cost,
        error: code === 0 ? undefined : err.slice(-500),
      });
    });
  });
}

const results = [];
let next = 0;
async function worker() {
  while (next < questions.length) {
    const q = questions[next++];
    const r = await ask(q);
    results.push(r);
    console.log(
      `${r.id} ${r.exitCode === 0 ? "ok" : `exit ${r.exitCode}`} ${r.seconds}s pages=${r.pages.length}`,
    );
    fs.writeFileSync(
      outFile,
      JSON.stringify({ model, docsDir, results }, null, 2),
    );
  }
}
await Promise.all(
  Array.from({ length: Math.min(concurrency, questions.length) }, worker),
);
results.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(
  outFile,
  JSON.stringify({ model, reader: args.reader, results }, null, 2),
);
console.log(`answers -> ${outFile}`);
