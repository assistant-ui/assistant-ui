import { build } from "tsup";
import { promises as fs } from "node:fs";
import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";
import { spawn } from "cross-spawn";

const transpileTypescript = async () => {
  await build({
    entry: ["src/**/*.{ts,tsx,js,jsx}", "!src/**/*.test.{ts,tsx}"],
    format: "esm",
    minify: false,
    sourcemap: true,

    splitting: false,
    silent: true,
    esbuildOptions: (config) => {
      config.dropLabels = ["DEV"];
    },
    esbuildPlugins: [
      esbuildPluginFilePathExtensions({
        esmExtension: "js",
      }),
    ],
  });
};

const transpileTypescriptDts = async () => {
  const child = spawn("pnpm", [
    "exec",
    "tsc",
    "-p",
    "tsconfig.json",
    "--emitDeclarationOnly",
    "--outDir",
    "dist",
    "--noEmit",
    "false",
    "--declaration",
    "--declarationMap",
  ]);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(
          new Error(`TypeScript type generation failed with exit code ${code}`),
        );
      } else {
        resolve(code);
      }
    });
    child.on("error", reject);
  });
};

const transformTailwindToCss = async (entrypoints: string[]) => {
  await build({
    entry: entrypoints,
    outDir: "dist/styles",
  });
};

export class Build {
  private tasks: Promise<unknown>[] = [];

  private constructor(private initTask: Promise<void>) {}

  public then(...args: Parameters<Promise<void>["then"]>) {
    return Promise.all(this.tasks)
      .then(() => {})
      .then(...args);
  }

  public transpileTypescript() {
    this.tasks.push(
      this.initTask.then(() => {
        return Promise.all([
          transpileTypescript(), // esm only
          transpileTypescriptDts(), // declarations
        ]);
      }),
    );
    return this;
  }

  public transpileCSS({ cssEntrypoints }: { cssEntrypoints: string[] }) {
    this.tasks.push(
      this.initTask.then(() => {
        return transformTailwindToCss(cssEntrypoints);
      }),
    );
    return this;
  }

  public static start() {
    const cleanTask = fs.rm("dist", { recursive: true, force: true });
    return new Build(cleanTask);
  }
}
