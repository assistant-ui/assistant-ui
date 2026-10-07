import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism, cpus } from "node:os";
import { stripVTControlCharacters } from "node:util";

const base = "592f5013eabba61bc454eec31719f4a4e12cbc54";
const candidate = "603cfbbc7500a12fcbdec3fce281629cf72a464c";
const output = "bench-results";
mkdirSync(output, { recursive: true });
const changed = execFileSync("git", ["diff", "--name-only", base, candidate], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter((file) => /(?:package|turbo)\.json$/.test(file));
const files = new Map(
  changed.map((file) => [
    file,
    {
      base: execFileSync("git", ["show", `${base}:${file}`]),
      candidate: readFileSync(file),
    },
  ]),
);
const originalRunner = `${output}/run-ci-tests.mjs`;
writeFileSync(
  originalRunner,
  execFileSync("git", ["show", `${base}:scripts/run-ci-tests.mjs`]),
);
const rows = [];
writeFileSync(
  `${output}/environment.json`,
  JSON.stringify(
    {
      base,
      candidate,
      node: process.version,
      sample: process.env.SAMPLE,
      cpus: cpus(),
      availableParallelism: availableParallelism(),
    },
    null,
    2,
  ),
);

function run(name, command, args, env) {
  console.log(`Starting ${name}`);
  const start = performance.now();
  const result = spawnSync(command, args, {
    env,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const seconds = (performance.now() - start) / 1000;
  const log = stripVTControlCharacters(
    (result.stdout ?? "") + (result.stderr ?? ""),
  );
  writeFileSync(`${output}/${name}.log`, log);
  const row = {
    name,
    seconds,
    exit: result.status,
    signal: result.signal,
    command: [command, ...args],
  };
  rows.push(row);
  writeFileSync(`${output}/results.json`, JSON.stringify(rows, null, 2));
  console.log(JSON.stringify(row));
  console.log(
    log
      .split("\n")
      .filter((line) =>
        /Test Files|Tests |Tasks:|Cached:|Duration|Time:|ELIFECYCLE|FAIL|^ℹ (tests|pass|fail|skipped)|Full uncached|Using serial/.test(
          line,
        ),
      )
      .join("\n"),
  );
  if (result.status !== 0) console.log(log.slice(-12000));
  return result.status === 0;
}

const orders = [
  ["baseline-test", "baseline-coverage", "candidate"],
  ["candidate", "baseline-coverage", "baseline-test"],
  ["baseline-coverage", "candidate", "baseline-test"],
];
for (const variant of orders[Number(process.env.SAMPLE)]) {
  const version = variant === "candidate" ? "candidate" : "base";
  for (const [file, contents] of files) writeFileSync(file, contents[version]);
  const config = JSON.parse(readFileSync("turbo.json", "utf8"));
  for (const task of ["test", "test:coverage", "test:react-compiler"])
    config.tasks[task].cache = false;
  writeFileSync("turbo.json", JSON.stringify(config));
  const cacheDir = `${process.env.RUNNER_TEMP}/single-test-pass-${variant}`;
  const env = {
    ...process.env,
    TURBO_CACHE_DIR: cacheDir,
    TURBO_CACHE: "local:rw",
  };
  delete env.TURBO_TOKEN;
  delete env.TURBO_TEAM;
  delete env.VITEST_MAX_WORKERS;
  if (
    !run(
      `${variant}-build`,
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        "--filter=./packages/*",
        "--filter=@assistant-ui/shadcn-registry",
      ],
      env,
    )
  )
    continue;
  const task = variant === "baseline-test" ? "test" : "test:coverage";
  const plan = execFileSync(
    "pnpm",
    ["exec", "turbo", "run", task, "--dry=json"],
    { env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  writeFileSync(`${output}/${variant}-plan.json`, plan);
  if (variant === "baseline-test")
    run(`${variant}-tests`, "node", [originalRunner], env);
  else
    run(
      `${variant}-tests`,
      "pnpm",
      ["exec", "turbo", "run", "test:coverage", "--concurrency=1"],
      env,
    );
  if (variant !== "baseline-coverage")
    run(
      `${variant}-compiler`,
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "test:react-compiler",
        "--filter=@assistant-ui/ai-sdk",
        "--filter=@assistant-ui/core",
        "--filter=@assistant-ui/store",
      ],
      env,
    );
  if (variant !== "baseline-test")
    run(
      `${variant}-summary`,
      "pnpm",
      [
        "run",
        "coverage:summary",
        "--",
        "--report",
        `${output}/${variant}-summary.md`,
      ],
      env,
    );
}
process.exitCode = rows.some((row) => row.exit !== 0) ? 1 : 0;
