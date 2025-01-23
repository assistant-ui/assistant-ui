import { execFileSync } from "child_process";
import debug from "debug";
import fs from "fs";
import path from "path";
import { TransformOptions } from "./transform-options";

const log = debug("codemod:transform");
const error = debug("codemod:transform:error");

function getJscodeshift(): string {
  const localJscodeshift = path.resolve(
    __dirname,
    "../../node_modules/.bin/jscodeshift",
  );
  return fs.existsSync(localJscodeshift) ? localJscodeshift : "npx jscodeshift";
}

function buildCommand(
  codemodPath: string,
  targetPath: string,
  jscodeshift: string,
  options: TransformOptions,
): string[] {
  const command = [
    jscodeshift,
    "-t", codemodPath,
    targetPath,
    "--parser", "tsx",
    "--ignore-pattern=**/node_modules/**",
    "--ignore-pattern=**/.*/**",
    "--ignore-pattern=**/dist/**",
    "--ignore-pattern=**/build/**",
    "--ignore-pattern=**/*.min.js",
    "--ignore-pattern=**/*.bundle.js"
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
  options: { logStatus: boolean } = { logStatus: true },
): TransformErrors {
  if (options.logStatus) {
    log(`Applying codemod '${codemod}': ${source}`);
  }
  const codemodPath = path.resolve(__dirname, `../codemods/${codemod}.js`);

  const targetPath = path.resolve(source);
  const jscodeshift = getJscodeshift();
  const command = buildCommand(
    codemodPath,
    targetPath,
    jscodeshift,
    transformOptions,
  );
  const stdout = execFileSync(command[0], command.slice(1), { encoding: "utf8", stdio: "pipe" });
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
