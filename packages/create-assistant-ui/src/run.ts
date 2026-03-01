import { spawn } from "cross-spawn";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

type AssistantUiBinField =
  | string
  | {
      [key: string]: string;
    };

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

type RunSpawn = (command: string, args: string[]) => Promise<void>;

export async function runSpawn(command: string, args: string[]): Promise<void> {
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

function resolveAssistantUiBinField(bin: AssistantUiBinField | undefined) {
  if (typeof bin === "string") {
    return bin;
  }

  return bin?.["assistant-ui"];
}

export async function resolveAssistantUiBinPath(params?: {
  resolvePackageJsonPath?: () => string;
  readTextFile?: (filePath: string) => Promise<string>;
}): Promise<string> {
  const resolvePackageJsonPath =
    params?.resolvePackageJsonPath ??
    (() => require.resolve("assistant-ui/package.json"));
  const readTextFile =
    params?.readTextFile ?? ((filePath) => readFile(filePath, "utf8"));

  const packageJsonPath = resolvePackageJsonPath();
  const packageJsonRaw = await readTextFile(packageJsonPath);
  const packageJson = JSON.parse(packageJsonRaw) as {
    bin?: AssistantUiBinField;
  };

  const binField = resolveAssistantUiBinField(packageJson.bin);

  if (!binField) {
    throw new Error("assistant-ui package does not expose a binary.");
  }

  return path.resolve(path.dirname(packageJsonPath), binField);
}

export function buildAssistantUiCreateArgs(commandArgs: string[]): string[] {
  if (commandArgs[0] === "create") {
    return commandArgs;
  }

  return ["create", ...commandArgs];
}

export async function delegateToAssistantUiCreate(params?: {
  commandArgs?: string[];
  resolveBinPath?: () => Promise<string>;
  runSpawnCommand?: RunSpawn;
}): Promise<void> {
  const commandArgs = params?.commandArgs ?? process.argv.slice(2);
  const resolveBinPath = params?.resolveBinPath ?? resolveAssistantUiBinPath;
  const runSpawnCommand = params?.runSpawnCommand ?? runSpawn;
  const assistantUiBinPath = await resolveBinPath();

  await runSpawnCommand(process.execPath, [
    assistantUiBinPath,
    ...buildAssistantUiCreateArgs(commandArgs),
  ]);
}

export async function main(): Promise<void> {
  try {
    await delegateToAssistantUiCreate();
  } catch (error) {
    if (error instanceof SpawnExitError) {
      console.error(
        `assistant-ui create process exited with code ${error.code}`,
      );
      process.exit(error.code);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
