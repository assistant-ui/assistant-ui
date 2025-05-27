import { build } from "tsup";
import { promises as fs } from "node:fs";
import postcss from "postcss";
import postcssJs from "postcss-js";
import path from "node:path";
import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";
import { spawn } from "cross-spawn";

const replaceNullWithObject = (obj: object): object => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value === true) return [key, {}];
      if (typeof value === "object" && value !== null)
        return [key, replaceNullWithObject(value)];
      return [key, value];
    }),
  );
};

const transformCssToJson = async (files: string[]) => {
  await Promise.all(
    files.map(async (file) => {
      const cssContent = await fs.readFile(file, "utf8");
      const root = postcss.parse(cssContent);
      const formattedComponents = replaceNullWithObject(
        postcssJs.objectify(root),
      );

      const outputFile = "dist/" + file.split("/").slice(1).join("/") + ".json";
      const outputContent = JSON.stringify(formattedComponents, null, 2);

      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, outputContent);
    }),
  );
};

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

  public transpileCSS({
    jsonEntrypoints,
    cssEntrypoints = jsonEntrypoints,
  }: {
    jsonEntrypoints: string[];
    cssEntrypoints?: string[];
  }) {
    this.initTask = this.initTask.then(() =>
      transformCssToJson(jsonEntrypoints),
    );
    this.tasks.push(
      this.initTask.then(() => {
        return Promise.all([
          transformTailwindToCss(cssEntrypoints), // css imports
        ]);
      }),
    );
    return this;
  }

  public static start() {
    const cleanTask = fs.rm("dist", { recursive: true, force: true });
    return new Build(cleanTask);
  }
}
