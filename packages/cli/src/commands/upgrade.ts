import { Command } from "commander";
import { transform } from "../lib/transform";
import { upgrade } from "../lib/upgrade";
import debug from "debug";

export interface TransformOptions {
  dry?: boolean;
  print?: boolean;
  verbose?: boolean;
  jscodeshift?: string;
}

const error = debug("codemod:error");
debug.enable("codemod:*");

const addTransformOptions = (command: Command): Command => {
  return command
    .option("-d, --dry", "Dry run (no changes are made to files)")
    .option("-p, --print", "Print transformed files to stdout")
    .option("--verbose", "Show more information about the transform process")
    .option(
      "-j, --jscodeshift <options>",
      "Pass options directly to jscodeshift",
    );
};

export const codemodCommand = addTransformOptions(
  new Command()
    .name("codemod")
    .description("CLI tool for running codemods")
    .argument("<codemod>", "Codemod to run (e.g., rewrite-framework-imports)")
    .argument("<source>", "Path to source files or directory to transform"),
).action((codemod, source, options: TransformOptions) => {
  try {
    transform(codemod, source, options);
  } catch (err: any) {
    error(`Error transforming: ${err}`);
    error(err.stack);
    process.exit(1);
  }
});

export const upgradeCommand = addTransformOptions(
  new Command()
    .command("upgrade")
    .description("Upgrade ai package dependencies and apply codemods"),
).action((options: TransformOptions) => {
  try {
    upgrade(options);
  } catch (err: any) {
    error(`Error upgrading: ${err}`);
    error(err.stack);
    process.exit(1);
  }
});
