import { execFileSync, spawnSync } from "child_process";
import debug from "debug";
import path from "path";
import { TransformOptions } from "./transform-options";
import { fileURLToPath } from "url";
import * as fs from "fs";
import { sync as globSync } from "glob";

const log = debug("codemod:transform");
const error = debug("codemod:transform:error");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gets the list of files that need to be processed in the codebase
 * Only includes files that contain "assistant-ui" to optimize performance
 */
export function getRelevantFiles(cwd: string): string[] {
  const pattern = "**/*.{js,jsx,ts,tsx}";
  const files = globSync(pattern, {
    cwd,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.min.js",
      "**/*.bundle.js",
    ],
  });

  // Filter files to only include those containing "assistant-ui"
  const relevantFiles = files.filter((file) => {
    try {
      const content = fs.readFileSync(path.join(cwd, file), "utf8");
      return content.includes("assistant-ui");
    } catch (err) {
      return false;
    }
  });

  return relevantFiles.map((file) => path.join(cwd, file));
}

/**
 * Counts the number of files that need to be processed
 */
export function countFilesToProcess(cwd: string): number {
  return getRelevantFiles(cwd).length;
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

function parseErrors(transform: string, output: string): TransformErrors {
  const errors: TransformErrors = [];
  const errorRegex = /ERR (.+) Transformation error/g;
  const syntaxErrorRegex = /SyntaxError: .+/g;

  let match;
  while ((match = errorRegex.exec(output)) !== null) {
    const filename = match[1]!;
    const syntaxErrorMatch = syntaxErrorRegex.exec(output);
    if (syntaxErrorMatch) {
      const summary = syntaxErrorMatch[0];
      errors.push({ transform, filename, summary });
    }
  }

  return errors;
}

export function transform(
  codemod: string,
  source: string,
  transformOptions: TransformOptions,
  options: {
    logStatus: boolean;
    onProgress?: (processedFiles: number) => void;
    relevantFiles?: string[];
  } = { logStatus: true },
): TransformErrors {
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

  // Use spawn instead of execFileSync to capture output in real-time
  if (options.onProgress) {
    const result = spawnSync(command[0]!, command.slice(1), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout = result.stdout || "";

    // Count the number of processed files from the output
    const processedFiles = (stdout.match(/Processing file/g) || []).length;
    if (options.onProgress) {
      options.onProgress(processedFiles);
    }

    const errors = parseErrors(codemod, stdout);
    if (options.logStatus && errors.length > 0) {
      errors.forEach(({ transform, filename, summary }) => {
        error(
          `Error applying codemod [codemod=${transform}, path=${filename}, summary=${summary}]`,
        );
      });
    }
    return errors;
  } else {
    // Use the original synchronous approach if no progress callback
    const stdout = execFileSync(command[0]!, command.slice(1), {
      encoding: "utf8",
      stdio: "pipe",
    });
    const errors = parseErrors(codemod, stdout);
    if (options.logStatus && errors.length > 0) {
      errors.forEach(({ transform, filename, summary }) => {
        error(
          `Error applying codemod [codemod=${transform}, path=${filename}, summary=${summary}]`,
        );
      });
    }
    return errors;
  }
}
