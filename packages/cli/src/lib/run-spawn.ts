import { spawn } from "cross-spawn";

export class SpawnExitError extends Error {
  code: number;
  details: string;

  constructor(code: number, details = "") {
    super(
      details
        ? `Process exited with code ${code}\n${details}`
        : `Process exited with code ${code}`,
    );
    this.code = code;
    this.details = details;
  }
}

export function runSpawn(
  command: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd,
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new SpawnExitError(code || 1));
      } else {
        resolve();
      }
    });
  });
}
