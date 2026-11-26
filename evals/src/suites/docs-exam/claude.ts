import { spawn } from "node:child_process";

export interface ClaudeRun {
  /** The final answer text. */
  result: string;
  /** Every stream-json event, for callers that need the tool calls. */
  events: Record<string, unknown>[];
  costUsd: number | null;
  seconds: number;
}

export interface ClaudeOptions {
  prompt: string;
  systemPrompt: string;
  model: string;
  /** Comma-separated tool names; empty for none. */
  tools: string;
  cwd: string;
  timeoutMs: number;
}

// A child inherits nothing from the agent session that launched the eval.
const childEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !/^(CLAUDE|ANTHROPIC_SESSION)/.test(k),
    ),
  ) as NodeJS.ProcessEnv;

/**
 * Runs `claude -p` once, confined to `cwd` (`--restricted`), with no user
 * settings, hooks or MCP servers (`--safe-mode`, `--strict-mcp-config`), and
 * only the tools named. Throws on a non-zero exit or a timeout, so the runner
 * records an error instead of a grade.
 */
export function runClaude(o: ClaudeOptions): Promise<ClaudeRun> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(
      process.env.CLAUDE_BIN ?? "claude",
      [
        "-p",
        o.prompt,
        "--model",
        o.model,
        "--system-prompt",
        o.systemPrompt,
        "--tools",
        o.tools,
        ...(o.tools ? ["--allowedTools", o.tools] : []),
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
      { cwd: o.cwd, env: childEnv(), stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => {
      out += d;
    });
    child.stderr.setEncoding("utf8").on("data", (d: string) => {
      err += d;
    });
    child.on("error", reject);
    const timer = setTimeout(() => child.kill("SIGTERM"), o.timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      const events: Record<string, unknown>[] = [];
      for (const line of out.split("\n")) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line));
        } catch {
          // A partial line from a killed process carries nothing we need.
        }
      }
      const final = events.findLast((e) => e.type === "result") as
        | { result?: string; total_cost_usd?: number; is_error?: boolean }
        | undefined;
      if (code !== 0 || !final || final.is_error) {
        reject(
          new Error(
            `claude exited ${code}${final?.is_error ? " with an error result" : ""}: ${(err || final?.result || "").slice(-300)}`,
          ),
        );
        return;
      }
      resolve({
        result: (final.result ?? "").trim(),
        events,
        costUsd: final.total_cost_usd ?? null,
        seconds: Math.round((Date.now() - started) / 1000),
      });
    });
  });
}
