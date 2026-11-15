import { existsSync } from "node:fs";
import { createBashTool } from "bash-tool";
import {
  Bash,
  type BashOptions,
  type ExecOptions,
  InMemoryFs,
  OverlayFs,
} from "just-bash";
import { repoSourceRoot } from "./repo-source";

const REPO_MOUNT = "/repo";
const MAX_OUTPUT_LENGTH = 15000;
const MAX_SANDBOX_WRITE_BYTES = 16 * 1024 * 1024;
// `sleep` and slow commands run in real time, so each command gets a deadline
// and the sandbox, which lives for one request, gets a total that leaves the
// function well inside its maxDuration however many steps the model takes.
const COMMAND_TIMEOUT_MS = 15_000;
const SANDBOX_TIME_BUDGET_MS = 60_000;

type RepoSandboxOptions = {
  toolPrompt?: string;
  /** Wall-clock limit for one command. */
  commandTimeoutMs?: number;
  /** Wall-clock limit for all commands in this sandbox together. */
  timeBudgetMs?: number;
};

type RepoToolkit = Awaited<ReturnType<typeof createBashTool>>;

/**
 * The mount is writable, so a shared sandbox would carry one visitor's edits
 * into the next request. Each caller gets its own copy-on-write overlay on the
 * deployed source tree, which costs its own writes rather than a second copy.
 */
export function createRepoSandbox(options: RepoSandboxOptions = {}) {
  let toolkitPromise: Promise<RepoToolkit> | null = null;
  return () => (toolkitPromise ??= createRepoToolkit(options));
}

function createRepoToolkit({
  toolPrompt,
  commandTimeoutMs = COMMAND_TIMEOUT_MS,
  timeBudgetMs = SANDBOX_TIME_BUDGET_MS,
}: RepoSandboxOptions) {
  const root = repoSourceRoot();

  return createBashTool({
    sandbox: new TimeBudgetedBash(
      {
        fs: createRepoFs(root),
        cwd: REPO_MOUNT,
        executionLimits: { maxExecutionTimeMs: commandTimeoutMs },
      },
      timeBudgetMs,
    ),
    destination: REPO_MOUNT,
    maxOutputLength: MAX_OUTPUT_LENGTH,
    ...(toolPrompt === undefined ? {} : { promptOptions: { toolPrompt } }),
  });
}

/** Stops every command once the sandbox has spent its total time budget. */
class TimeBudgetedBash extends Bash {
  private remainingMs: number;

  constructor(options: BashOptions, budgetMs: number) {
    super(options);
    this.remainingMs = budgetMs;
  }

  override async exec(commandLine: string, options: ExecOptions = {}) {
    const budget =
      this.remainingMs > 0
        ? AbortSignal.timeout(this.remainingMs)
        : AbortSignal.abort();
    const signal = options.signal
      ? AbortSignal.any([options.signal, budget])
      : budget;
    const startedAt = Date.now();
    try {
      return await super.exec(commandLine, { ...options, signal });
    } finally {
      this.remainingMs -= Date.now() - startedAt;
    }
  }
}

// The tree is missing only before generate:source-snapshot has run, so the empty
// mount keeps a local dev server usable and recovers as soon as it does run.
function createRepoFs(root: string) {
  if (existsSync(root)) {
    return new OverlayFs({
      root,
      mountPoint: REPO_MOUNT,
      maxMemoryBytes: MAX_SANDBOX_WRITE_BYTES,
    });
  }

  console.warn(
    `Missing repo source tree at ${root}; repo tools will be unavailable until generate:source-snapshot runs.`,
  );

  return new InMemoryFs({}, { maxTotalBytes: MAX_SANDBOX_WRITE_BYTES });
}
