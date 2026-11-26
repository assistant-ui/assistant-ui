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

// Readers run in their own process groups, which a Ctrl-C on the runner
// doesn't reach, so the runner stops the live ones itself on the way out.
const live = new Set<number>();
const signalLive = (signal: NodeJS.Signals) => {
  for (const pid of live) {
    try {
      process.kill(-pid, signal);
    } catch {
      // Already gone.
    }
  }
};
const shutdownHooks: (() => void)[] = [];
/** Runs `hook` when the runner exits or is interrupted, such as removing a temp folder. */
export const onShutdown = (hook: () => void) => {
  shutdownHooks.push(hook);
};
const runShutdownHooks = () => {
  for (const hook of shutdownHooks.splice(0)) {
    try {
      hook();
    } catch {
      // Best effort on the way out.
    }
  }
};
process.once("exit", () => {
  signalLive("SIGKILL");
  runShutdownHooks();
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    // SIGTERM first; whatever is still running 2 s later is killed.
    signalLive("SIGTERM");
    const deadline = Date.now() + 2_000;
    const check = setInterval(() => {
      if (live.size > 0 && Date.now() < deadline) return;
      clearInterval(check);
      signalLive("SIGKILL");
      runShutdownHooks();
      process.exit(128 + (signal === "SIGINT" ? 2 : 15));
    }, 100);
  });
}

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
      // Its own process group, so a timeout can stop anything it started too.
      {
        cwd: o.cwd,
        env: childEnv(),
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      },
    );
    if (child.pid !== undefined) live.add(child.pid);
    const killGroup = (signal: NodeJS.Signals) => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, signal);
      } catch {
        child.kill(signal);
      }
    };
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => {
      out += d;
    });
    child.stderr.setEncoding("utf8").on("data", (d: string) => {
      err += d;
    });
    let settled = false;
    const fail = (e: Error) => {
      if (settled) return;
      settled = true;
      reject(e);
    };
    child.on("error", fail);
    // At the deadline the group gets SIGTERM, and SIGKILL 5 s later if the
    // child is still there. The call fails once the child has exited (not on
    // `close`, which a grandchild holding a pipe can delay), so a pool slot
    // never holds two live readers.
    let killTimer: NodeJS.Timeout | undefined;
    const timer = setTimeout(() => {
      const timedOut = new Error(`claude timed out after ${o.timeoutMs} ms`);
      if (child.exitCode !== null || child.signalCode !== null) {
        fail(timedOut);
        return;
      }
      child.once("exit", () => fail(timedOut));
      killGroup("SIGTERM");
      killTimer = setTimeout(() => {
        killGroup("SIGKILL");
        // Exit follows SIGKILL; this only guards against a child that can't be signalled.
        setTimeout(() => fail(timedOut), 1_000).unref();
      }, 5_000);
    }, o.timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      if (child.pid !== undefined) live.delete(child.pid);
      if (settled) return;
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
        fail(
          new Error(
            `claude exited ${code}${final?.is_error ? " with an error result" : ""}: ${(err || final?.result || "").slice(-300)}`,
          ),
        );
        return;
      }
      settled = true;
      resolve({
        result: (final.result ?? "").trim(),
        events,
        costUsd: final.total_cost_usd ?? null,
        seconds: Math.round((Date.now() - started) / 1000),
      });
    });
  });
}
