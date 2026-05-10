import { spawn } from "cross-spawn";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

function runSpawn(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
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
    if (error instanceof SpawnExitError) {
      process.exit(error.code);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
