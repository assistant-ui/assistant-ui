import { spawn } from "cross-spawn";

export class SpawnExitError extends Error {
  code: number;
  stderr: string;

  constructor(code: number, stderr = "") {
    super(
      stderr
        ? `Process exited with code ${code}\n${stderr}`
        : `Process exited with code ${code}`,
    );
    this.code = code;
    this.stderr = stderr;
  }
}

export class SpawnSignalError extends Error {
  signal: NodeJS.Signals;
  forwarded: boolean;

  constructor(signal: NodeJS.Signals, forwarded: boolean) {
    super(`Process terminated by ${signal}`);
    this.signal = signal;
    this.forwarded = forwarded;
  }
}

export interface SpawnResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

let activeSpawns = 0;

// A spawn that is forwarding a signal owns termination for that window, so
// callers with their own cleanup listeners defer to it instead of racing it.
export const hasActiveSpawn = (): boolean => activeSpawns > 0;

function spawnProcess(
  command: string,
  args: string[],
  cwd: string | undefined,
  captureOutput: boolean,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      cwd,
    });
    let forwardedSignal: NodeJS.Signals | null = null;
    let escalated = false;
    let settled = false;
    let stdout = "";
    let stderr = "";

    if (captureOutput) {
      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (chunk: string) => {
        stderr += chunk;
      });
    }

    const cleanup = () => {
      activeSpawns -= 1;
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    };

    const rejectForwardedSignal = () => {
      if (settled || forwardedSignal === null) return false;
      settled = true;
      child.stdout?.destroy();
      child.stderr?.destroy();
      cleanup();
      reject(new SpawnSignalError(forwardedSignal, true));
      return true;
    };

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (forwardedSignal !== null) {
        if (!escalated) {
          escalated = true;
          child.kill("SIGKILL");
          return;
        }

        rejectForwardedSignal();
        return;
      }

      forwardedSignal = signal;
      child.kill(signal);
    };
    const onSigint = () => forwardSignal("SIGINT");
    const onSigterm = () => forwardSignal("SIGTERM");

    activeSpawns += 1;
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);

    child.on("error", (error) => {
      if (settled) return;
      if (rejectForwardedSignal()) return;
      settled = true;
      cleanup();
      reject(error);
    });
    // "close" waits for stdio pipes, which a grandchild can hold open after
    // the child is reaped, so a forwarded signal settles on "exit".
    child.on("exit", () => {
      rejectForwardedSignal();
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      if (rejectForwardedSignal()) return;
      settled = true;
      cleanup();
      resolve({ code, signal: signal ?? null, stdout, stderr });
    });
  });
}

export function runSpawn(
  command: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  return spawnProcess(command, args, cwd, false).then(({ code, signal }) => {
    if (signal != null) {
      throw new SpawnSignalError(signal, false);
    }
    if (code !== 0) {
      throw new SpawnExitError(code || 1);
    }
  });
}

export function runSpawnCapture(
  command: string,
  args: string[],
  cwd?: string,
): Promise<SpawnResult> {
  return spawnProcess(command, args, cwd, true);
}
