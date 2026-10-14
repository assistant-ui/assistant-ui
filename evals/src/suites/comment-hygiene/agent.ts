import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import type { EvalCase } from "./types.ts";

const AGENT_MODEL = process.env.AGENT_MODEL;

/**
 * Run the agent on a case inside a throwaway sandbox, optionally with guidance
 * appended to its system prompt. The sandbox lives outside the repo so the
 * agent is genuinely undirected — it sees no AGENTS.md/CLAUDE.md except the
 * guidance we inject. Returns the post-run contents of the inspected files.
 */
export function runAgent(c: EvalCase, guidance: string): string {
  const dir = mkdtempSync(join(tmpdir(), "aui-eval-"));
  try {
    for (const f of c.seed) {
      const p = join(dir, f.path);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, f.content);
    }

    const args = ["-p", c.task, "--permission-mode", "acceptEdits"];
    if (AGENT_MODEL) args.push("--model", AGENT_MODEL);
    if (guidance) args.push("--append-system-prompt", guidance);

    const res = spawnSync("claude", args, {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 180_000,
    });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      throw new Error(
        `agent exited with status ${res.status}: ${res.stderr?.trim() ?? ""}`,
      );
    }

    return c.inspect
      .map((rel) => {
        let body: string;
        try {
          body = readFileSync(join(dir, rel), "utf8");
        } catch {
          body = "<file missing>";
        }
        return `// ===== ${rel} =====\n${body}`;
      })
      .join("\n\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
