import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { availableParallelism } from "node:os";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";

mkdirSync("bench-results", { recursive: true });
const rows = [];
function run(name, command, args, options = {}) {
  const start = performance.now();
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  const log = result.stdout + result.stderr;
  writeFileSync(`bench-results/${name}.log`, log);
  const row = {
    name,
    seconds: (performance.now() - start) / 1000,
    exit: result.status,
    cpu: availableParallelism(),
  };
  rows.push(row);
  writeFileSync("bench-results/results.json", JSON.stringify(rows, null, 2));
  console.log(JSON.stringify(row));
  console.log(
    stripVTControlCharacters(log)
      .split("\n")
      .filter((line) =>
        /Scope:|Test Files|Tests |Tasks:|Duration|Time:|ELIFECYCLE|Error:|FAIL/.test(
          line,
        ),
      )
      .join("\n"),
  );
  return row;
}
function save() {
  writeFileSync("bench-results/results.json", JSON.stringify(rows, null, 2));
}
if (process.argv[2] === "install") {
  const { EXAMPLE: example, VARIANT: variant } = process.env;
  const scoped = variant.startsWith("scoped");
  const args = [
    "install",
    "--frozen-lockfile",
    ...(scoped
      ? [
          "--filter=.",
          `--filter=${example}...`,
          "--filter=@assistant-ui/react-devtools...",
        ]
      : []),
  ];
  const row = run("install", "pnpm", args);
  if (row.exit !== 0) process.exit(1);
  row.packages = readdirSync("node_modules/.pnpm", {
    withFileTypes: true,
  }).filter((d) => d.isDirectory() && d.name !== "node_modules").length;
  row.devtoolsCss = createHash("sha256")
    .update(
      readFileSync("packages/react-devtools/src/styles/panel.generated.ts"),
    )
    .digest("hex");
  save();
  const config = JSON.parse(
    readFileSync(`examples/${example}/vercel.json`, "utf8"),
  );
  run(
    "nested-install",
    "pnpm",
    scoped
      ? [
          ...args.slice(0, 2),
          "--filter=@assistant-ui/monorepo",
          `--filter=${example}...`,
          "--filter=@assistant-ui/react-devtools...",
        ]
      : ["install", "--frozen-lockfile"],
    { cwd: `examples/${example}` },
  );
  const build = run("build", "bash", ["-c", config.buildCommand], {
    cwd: `examples/${example}`,
  });
  if (build.exit === 0) {
    const output = path.join("examples", example, config.outputDirectory);
    const files = readdirSync(output, { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => path.join(f.parentPath, f.name));
    writeFileSync(
      "bench-results/output-hashes.json",
      JSON.stringify(
        files.map((file) => ({
          file: path.relative(output, file),
          hash: createHash("sha256").update(readFileSync(file)).digest("hex"),
        })),
        null,
        2,
      ),
    );
  }
  process.exit(build.exit === 0 ? 0 : 1);
} else {
  const config = JSON.parse(readFileSync("turbo.json", "utf8"));
  config.tasks.test.cache = false;
  config.tasks.test.passThroughEnv = ["VITEST_MAX_WORKERS"];
  writeFileSync("turbo.json", JSON.stringify(config));
  if (
    run("build", "pnpm", ["turbo", "build", "--filter=./packages/*"]).exit !== 0
  )
    process.exit(1);
  const variants =
    Number(process.env.SAMPLE) % 2
      ? ["parallel", "serial"]
      : ["serial", "parallel"];
  for (const variant of variants) {
    const env = { ...process.env };
    if (variant === "parallel") env.VITEST_MAX_WORKERS = "2";
    else delete env.VITEST_MAX_WORKERS;
    run(
      variant,
      "pnpm",
      ["turbo", "test", `--concurrency=${variant === "parallel" ? 2 : 1}`],
      { env },
    );
  }
  process.exit(rows.some((row) => row.exit !== 0) ? 1 : 0);
}
