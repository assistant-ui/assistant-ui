import { build } from "tsup";
import { promises as fs } from "node:fs";
import postcss from "postcss";
import postcssJs from "postcss-js";
import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";
import path from "node:path";
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
    format: ["cjs", "esm"],
    bundle: true,
    minify: false,
    sourcemap: true,
    splitting: false,
    esbuildPlugins: [esbuildPluginFilePathExtensions()],
  });
};

const transpileTypescriptDts = async () => {
  const child = spawn("npx", ["tsc", "-p", "tsconfig.declarations.json"]);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  return new Promise((r, e) => {
    child.on("exit", r);
    child.on("error", e);
  });
};

const transformTailwindToCss = async (entrypoints: string[]) => {
  await build({
    entry: entrypoints,
    outDir: "dist/styles",
    sourcemap: true,
  });
};

const copyFiles = async (entrypoints: string[]) => {
  await Promise.all(
    entrypoints.map(async (entrypoint) => {
      const source = entrypoint;
      const target = "dist/" + entrypoint.split("/").slice(1).join("/");

      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }),
  );
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
          transpileTypescript(), // cjs and esm
          transpileTypescriptDts(), // declarations
        ]);
      }),
    );
    return this;
  }

  public transpileCSS({
    tailwindEntrypoints,
    cssEntrypoints = tailwindEntrypoints,
  }: {
    tailwindEntrypoints: string[];
    cssEntrypoints?: string[];
  }) {
    this.initTask = this.initTask.then(() =>
      transformCssToJson(tailwindEntrypoints),
    );
    this.tasks.push(
      this.initTask.then(() => {
        return Promise.all([
          copyFiles(tailwindEntrypoints), // tailwind direct imports
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
