import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { summarizeTranscript } from "./transcript.ts";

const tool = (name: string, input: object) => ({
  type: "assistant",
  message: { content: [{ type: "tool_use", name, input }] },
});

test("summarizeTranscript finds the docs pages, node_modules lookups and the closing note", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-docs-transcript-"));
  const docs = "/runs/docs/site";
  try {
    const file = join(dir, "transcript.jsonl");
    const events = [
      { type: "system", subtype: "init" },
      tool("Read", { file_path: `${docs}/llms.txt` }),
      tool("Bash", {
        command: `cd ${docs}/docs; cat manual-installation.md runtimes/ai-sdk/v7.md`,
      }),
      tool("Bash", { command: `head -50 ${docs}/elements/thread.md` }),
      tool("Grep", { pattern: "TooltipProvider", path: docs }),
      tool("Bash", {
        command:
          "grep -r useChatRuntime node_modules/@assistant-ui/react-ai-sdk",
      }),
      tool("WebFetch", {
        url: "https://www.assistant-ui.com/docs/installation.md",
      }),
      tool("Bash", { command: "curl -s https://example.com/x" }),
      tool("Bash", { command: "curl -s http://127.0.0.1:3000/" }),
      // Claude Code refusing a call counts; a command that failed doesn't.
      {
        type: "user",
        message: {
          content: [
            {
              type: "tool_result",
              is_error: true,
              content:
                "allowed_domains cannot widen network access in this session",
            },
            {
              type: "tool_result",
              is_error: true,
              content: [
                { type: "text", text: "Exit code 1\nnpm ERR! 404 Not Found" },
              ],
            },
          ],
        },
      },
      {
        type: "result",
        num_turns: 12,
        duration_ms: 95_400,
        total_cost_usd: 0.4,
        result: "Built it. Docs: the route example is stale.",
      },
    ];
    writeFileSync(file, events.map((e) => JSON.stringify(e)).join("\n"));
    const summary = summarizeTranscript(file, docs);
    assert.deepEqual(summary.docsRead, [
      "/llms.txt",
      "/docs/manual-installation.md",
      "/docs/runtimes/ai-sdk/v7.md",
      "/elements/thread.md",
      "/docs/installation.md",
    ]);
    assert.deepEqual(summary.docsSearches, ["TooltipProvider"]);
    assert.equal(summary.nodeModulesLookups, 1);
    assert.deepEqual(summary.webFetches, ["curl -s https://example.com/x"]);
    assert.deepEqual(summary.refusals, [
      "allowed_domains cannot widen network access in this session",
    ]);
    assert.equal(summary.turns, 12);
    assert.equal(summary.answerSeconds, 95);
    assert.equal(summary.costUsd, 0.4);
    assert.equal(
      summary.finalMessage,
      "Built it. Docs: the route example is stale.",
    );
    assert.equal(summary.agentError, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("summarizeTranscript keeps why the agent didn't finish: an error answer, as at a usage limit, or none", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-docs-transcript-"));
  try {
    const file = join(dir, "transcript.jsonl");
    const events = [
      { type: "system", subtype: "init" },
      {
        type: "result",
        subtype: "success",
        is_error: true,
        num_turns: 3,
        result: "You've hit your limit",
      },
      { type: "result", subtype: "success", is_error: true, result: "later" },
    ];
    writeFileSync(file, events.map((e) => JSON.stringify(e)).join("\n"));
    assert.equal(
      summarizeTranscript(file, "/runs/docs/site").agentError,
      "You've hit your limit",
    );
    writeFileSync(file, JSON.stringify({ type: "system", subtype: "init" }));
    assert.equal(
      summarizeTranscript(file, "/runs/docs/site").agentError,
      "the agent never answered",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
