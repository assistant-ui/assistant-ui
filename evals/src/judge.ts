import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Verdict } from "./types.ts";

const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "claude-sonnet-4-6";

const JUDGE_SYSTEM =
  "You are a strict code reviewer scoring a single criterion. " +
  "Reply with one line of minified JSON and nothing else.";

/** Score one artifact against a rubric with a fresh, undirected judge. */
export function runJudge(rubric: string, artifact: string): Verdict {
  const prompt = [
    rubric,
    "",
    "Code under review:",
    "```",
    artifact,
    "```",
    "",
    'Respond with exactly: {"pass": <true|false>, "reason": "<one sentence>"}',
  ].join("\n");

  // Judge in an empty sandbox so it has no repo context to wander into — it
  // should classify the artifact, not behave like a coding agent.
  const dir = mkdtempSync(join(tmpdir(), "aui-judge-"));
  try {
    const res = spawnSync(
      "claude",
      [
        "-p",
        prompt,
        "--model",
        JUDGE_MODEL,
        "--append-system-prompt",
        JUDGE_SYSTEM,
      ],
      {
        cwd: dir,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        timeout: 120_000,
      },
    );
    if (res.error) throw res.error;
    if (res.status !== 0) {
      throw new Error(
        `judge exited with status ${res.status}: ${res.stderr?.trim() ?? ""}`,
      );
    }
    return parseVerdict(res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseVerdict(out: string): Verdict {
  const m = out.match(/\{[\s\S]*\}/);
  if (!m)
    return {
      pass: false,
      reason: `unparseable judge output: ${out.slice(0, 120)}`,
    };
  try {
    const j = JSON.parse(m[0]);
    return { pass: j.pass === true, reason: String(j.reason ?? "") };
  } catch {
    return { pass: false, reason: `invalid judge JSON: ${m[0].slice(0, 120)}` };
  }
}
