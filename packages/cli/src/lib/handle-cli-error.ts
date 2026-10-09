import { constants } from "node:os";
import { SpawnSignalError } from "./run-spawn";

export function handleCliError(error: unknown): void {
  if (error instanceof SpawnSignalError) {
    process.exitCode = 128 + (constants.signals[error.signal] ?? 0);
    if (error.forwarded) {
      process.kill(process.pid, error.signal);
    } else {
      console.error(error.message);
    }
    return;
  }

  console.error(error);
  process.exitCode = 1;
}
