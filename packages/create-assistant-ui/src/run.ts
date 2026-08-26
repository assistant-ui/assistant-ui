import { spawn } from "cross-spawn";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { constants } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

class SpawnSignalError extends Error {
  signal: NodeJS.Signals;
  forwarded: boolean;

  constructor(signal: NodeJS.Signals, forwarded: boolean) {
    super(`Process terminated by ${signal}`);
    this.signal = signal;
    this.forwarded = forwarded;
  }
}

export function runSpawn(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });
    let forwardedSignal: NodeJS.Signals | null = null;

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (forwardedSignal !== null) {
        child.kill("SIGKILL");
        cleanup();
        reject(new SpawnSignalError(signal, true));
        return;
      }
      forwardedSignal = signal;
      child.kill(signal);
    };
    const onSigint = () => forwardSignal("SIGINT");
    const onSigterm = () => forwardSignal("SIGTERM");
    const cleanup = () => {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    };

    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);

    child.on("error", (error) => {
      cleanup();
      reject(error);
    });
    child.on("close", (code, signal) => {
      cleanup();
      if (forwardedSignal !== null) {
        reject(new SpawnSignalError(forwardedSignal, true));
        return;
      }
      if (signal !== null) {
        reject(new SpawnSignalError(signal, false));
        return;
      }
      if (code !== 0) {
        reject(new SpawnExitError(code || 1));
      } else {
        resolve();
      }
    });
  });
}

async function resolveAssistantUiBinPath(): Promise<string> {
  const packageJsonPath = require.resolve("assistant-ui/package.json");
  const packageJsonRaw = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonRaw) as {
    bin?: string | Record<string, string>;
  };

  const bin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin?.["assistant-ui"];

  if (!bin) {
    throw new Error("assistant-ui package does not expose a binary.");
  }

  return path.resolve(path.dirname(packageJsonPath), bin);
}

export async function main(): Promise<void> {
  try {
    const assistantUiBinPath = await resolveAssistantUiBinPath();

    const args = process.argv.slice(2);
    if (args[0] !== "create") {
      args.unshift("create");
    }

    await runSpawn(process.execPath, [assistantUiBinPath, ...args]);
  } catch (error) {
    if (error instanceof SpawnSignalError) {
      if (error.forwarded) {
        process.removeAllListeners(error.signal);
        process.kill(process.pid, error.signal);
      }
      process.exit(128 + (constants.signals[error.signal] ?? 0));
    }

    if (error instanceof SpawnExitError) {
      process.exit(error.code);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
