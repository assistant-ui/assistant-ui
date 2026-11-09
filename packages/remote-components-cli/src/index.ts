import { existsSync, readFileSync, watch as fsWatch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";
import type { Alias } from "vite";

const INDEX_FILES = ["index.tsx", "index.ts", "index.jsx", "index.js"];
const BUNDLED = [
  "react",
  "react-dom",
  "@assistant-ui/remote-components-react",
] as const;

const USAGE = `Usage: remote-components build [entry] [--out <file>] [--watch]

Builds one React component (default export) into one self-contained HTML file.

  entry          Component file. Default: index.tsx, index.ts, index.jsx or index.js
  -o, --out      Output file. Default: dist/<name>.html
  -w, --watch    Rebuild when files change
  -h, --help     Show this help`;

export interface BuildOptions {
  /** Component file. Default: the index file in `cwd`. */
  entry?: string;
  /** Output file. Default: `dist/<name>.html` in `cwd`. */
  out?: string;
  /** Project root: resolves imports and the tsconfig. Default: process.cwd(). */
  cwd?: string;
  minify?: boolean;
}

export interface BuildResult {
  entry: string;
  out: string;
  bytes: number;
}

export class CliError extends Error {}

/** The component file: `entry` if given, else the first index file in `cwd`. */
export function resolveEntry(cwd: string, entry?: string): string {
  if (entry !== undefined) {
    const file = path.resolve(cwd, entry);
    if (!existsSync(file)) throw new CliError(`No such file: ${entry}`);
    return file;
  }
  for (const name of INDEX_FILES) {
    const file = path.join(cwd, name);
    if (existsSync(file)) return file;
  }
  throw new CliError(
    `No component found. Pass a file (remote-components build rating.tsx) or add ${INDEX_FILES.join(", ")} here.`,
  );
}

/** The package root that holds `file` (the nearest `package.json` with a name). */
function packageDir(file: string): string {
  let dir = path.dirname(file);
  while (dir !== path.dirname(dir)) {
    const pkg = path.join(dir, "package.json");
    if (existsSync(pkg) && /"name"\s*:/.test(readFileSync(pkg, "utf8")))
      return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`[rc] No package.json above ${file}`);
}

/**
 * React, react-dom and the hooks resolve from the project when it has
 * them, and from this package otherwise, so a lone component file builds.
 */
function fallbackAliases(root: string): Alias[] {
  const fromCli = createRequire(import.meta.url);
  const aliases: Alias[] = [];
  for (const pkg of BUNDLED) {
    if (installedIn(root, pkg)) continue;
    aliases.push({ find: pkg, replacement: packageDir(fromCli.resolve(pkg)) });
  }
  return aliases;
}

/** Whether `node_modules/<pkg>` exists in `dir` or above (how Vite resolves bare imports). */
function installedIn(dir: string, pkg: string): boolean {
  for (let d = dir; ; d = path.dirname(d)) {
    if (existsSync(path.join(d, "node_modules", pkg, "package.json")))
      return true;
    if (d === path.dirname(d)) return false;
  }
}

function entryName(entry: string): string {
  return path.basename(entry).replace(/\.[cm]?[jt]sx?$/, "");
}

function outFile(cwd: string, name: string, out?: string): string {
  return path.resolve(cwd, out ?? path.join("dist", `${name}.html`));
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const entry = resolveEntry(cwd, options.entry);
  const name = entryName(entry);
  const out = outFile(cwd, name, options.out);
  const source = await readFile(entry, "utf8");
  if (!/\bexport\s+default\b|\bas\s+default\b/.test(source))
    throw new CliError(
      `${path.relative(cwd, entry)} has no default export. Export the component: export default function Rating() { … }`,
    );
  const [{ buildSingleFile }, { default: react }] = await Promise.all([
    import("@assistant-ui/remote-components-vite"),
    import("@vitejs/plugin-react"),
  ]);
  // A production build even when NODE_ENV says otherwise (React's dev
  // JSX runtime and checks have no place in a shipped file).
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const html = await buildSingleFile({
    file: entry,
    name,
    root: cwd,
    plugins: [react()],
    ...(options.minify !== undefined ? { minify: options.minify } : {}),
    vite: {
      resolve: {
        alias: fallbackAliases(cwd),
        dedupe: ["react", "react-dom"],
        tsconfigPaths: true,
      },
    },
  }).finally(() => {
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
  });
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
  return { entry, out, bytes: Buffer.byteLength(html) };
}

function report(cwd: string, r: BuildResult): void {
  const kb = (r.bytes / 1024).toFixed(1);
  console.log(`${path.relative(cwd, r.out) || r.out}  ${kb} kB`);
}

function watchAndRebuild(cwd: string, options: BuildOptions): Promise<never> {
  const entry = resolveEntry(cwd, options.entry);
  const written = outFile(cwd, entryName(entry), options.out);
  let timer: NodeJS.Timeout | undefined;
  let running = Promise.resolve();
  const rebuild = (): void => {
    running = running.then(() =>
      build(options).then(
        (r) => report(cwd, r),
        (e: unknown) => console.error(e instanceof Error ? e.message : e),
      ),
    );
  };
  fsWatch(cwd, { recursive: true }, (_event, file) => {
    if (file === null) return;
    const abs = path.resolve(cwd, file.toString());
    if (
      abs === written ||
      abs.split(path.sep).includes("node_modules") ||
      abs.split(path.sep).includes(".git")
    )
      return;
    clearTimeout(timer);
    timer = setTimeout(rebuild, 50);
  });
  console.log("Watching for changes…");
  return new Promise<never>(() => {});
}

/** Runs the CLI. Resolves to the exit code (never, with --watch). */
export async function main(
  argv: string[],
  cwd: string = process.cwd(),
): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: "string", short: "o" },
        watch: { type: "boolean", short: "w" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) {
    console.error(`${(e as Error).message}\n\n${USAGE}`);
    return 1;
  }
  const { values, positionals } = parsed;
  const [command, entry, ...rest] = positionals;
  if (values.help || command === undefined) {
    console.log(USAGE);
    return values.help ? 0 : 1;
  }
  if (command === "dev") {
    console.error(
      "remote-components dev is not available yet. Use: remote-components build --watch",
    );
    return 1;
  }
  if (command !== "build" || rest.length > 0) {
    console.error(
      `${command !== "build" ? `Unknown command: ${command}` : `Too many arguments: ${rest.join(" ")}`}\n\n${USAGE}`,
    );
    return 1;
  }
  const options: BuildOptions = {
    cwd,
    ...(entry !== undefined ? { entry } : {}),
    ...(values.out !== undefined ? { out: values.out } : {}),
  };
  try {
    report(cwd, await build(options));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    if (!values.watch || e instanceof CliError) return 1;
  }
  if (values.watch) return watchAndRebuild(cwd, options);
  return 0;
}
