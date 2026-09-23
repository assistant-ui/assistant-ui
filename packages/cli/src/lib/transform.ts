import debug from "debug";
import path from "node:path";
import type { TransformOptions } from "./transform-options";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { sync as globSync } from "glob";
import { runSpawnCapture, SpawnExitError, SpawnSignalError } from "./run-spawn";

const log = debug("codemod:transform");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gets relevant source files from an explicit file or directory target.
 * Directory scans only include files containing "assistant-ui".
 */
export function getRelevantFiles(source: string): string[] {
  const target = path.resolve(source);
  if (fs.statSync(target).isFile()) {
    return /\.(js|jsx|ts|tsx)$/.test(target) ? [target] : [];
  }

  const pattern = "**/*.{js,jsx,ts,tsx}";
  const files = globSync(pattern, {
    cwd: target,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.min.js",
      "**/*.bundle.js",
    ],
  }).map((file) => path.join(target, file));

  const relevantFiles = files.filter((file) => {
    try {
      const content = fs.readFileSync(file, "utf8");
      return content.includes("assistant-ui");
    } catch {
      return false;
    }
  });

  return relevantFiles;
}

/**
 * Counts the number of files that need to be processed
 */
export function countFilesToProcess(source: string): number {
  return getRelevantFiles(source).length;
}

function buildCommand(
  codemodPath: string,
  targetFiles: string[],
  options: TransformOptions,
): string[] {
  const command = [
    "npx",
    "jscodeshift",
    "-t",
    codemodPath,
    ...targetFiles,
    "--parser",
    "tsx",
    "--fail-on-error",
  ];

  if (options.dry) {
    command.push("--dry");
  }

  if (options.print) {
    command.push("--print");
  }

  if (options.verbose) {
    command.push("--verbose");
  }

  if (options.jscodeshift) {
    command.push(options.jscodeshift);
  }

  return command;
}

export type TransformErrors = {
  transform: string;
  filename: string;
  summary: string;
}[];

export async function transform(
  codemod: string,
  source: string,
  transformOptions: TransformOptions,
  options: {
    logStatus: boolean;
    onProgress?: (processedFiles: number) => void;
    relevantFiles?: string[];
  } = { logStatus: true },
): Promise<TransformErrors> {
  if (options.logStatus) {
    log(`Applying codemod '${codemod}': ${source}`);
  }
  const codemodPath = path.resolve(__dirname, `../codemods/${codemod}.js`);

  // Use pre-computed relevant files if provided, otherwise get them
  const targetFiles = options.relevantFiles || getRelevantFiles(source);

  if (targetFiles.length === 0) {
    log(`No relevant files found for codemod '${codemod}'`);
    return [];
  }

  log(`Found ${targetFiles.length} relevant files for codemod '${codemod}'`);

  const command = buildCommand(codemodPath, targetFiles, transformOptions);

  const result = await runSpawnCapture(command[0]!, command.slice(1));
  if (result.signal !== null) {
    throw new SpawnSignalError(result.signal, false);
  }
  if (result.code !== 0) {
    const failure = new SpawnExitError(
      result.code || 1,
      result.stderr,
      result.stdout,
    );
    failure.message = `Codemod '${codemod}' failed\n${failure.message}`;
    throw failure;
  }

  const { stdout } = result;

  if (options.onProgress) {
    const processedFiles = (stdout.match(/Processing file/g) || []).length;
    options.onProgress(processedFiles);
  }

  return [];
}
