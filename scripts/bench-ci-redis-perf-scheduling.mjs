import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { REF_PACKAGE_DIRS } from "../packages/x-performance/lib/ref-packages.mjs";

const source = process.cwd();
const mode = process.env.BENCH_MODE;
const sample = Number(process.env.BENCH_SAMPLE);
const base = "bb428e591652a170d59b4aceed84b8a054a692ee";
const output = resolve("bench-results");
mkdirSync(output, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "aui-ci-followup-"));
const cleanEnv = {
  ...process.env,
  CI: "true",
  TURBO_TELEMETRY_DISABLED: "1",
  PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
  NO_COLOR: "1",
  FORCE_COLOR: "0",
};
delete cleanEnv.TURBO_TOKEN;
delete cleanEnv.TURBO_TEAM;
delete cleanEnv.REDIS_URL;
const redisEnv = { ...cleanEnv, REDIS_URL: "redis://127.0.0.1:6379" };
const results = {
  mode,
  sample,
  base,
  cpus: availableParallelism(),
  node: process.version,
  rows: [],
};
const save = () =>
  writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
let sequence = 0;
function run(cwd, label, cmd, args, env = cleanEnv) {
  console.log(`START ${label}`);
  const start = performance.now();
  const res = spawnSync(cmd, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const seconds = (performance.now() - start) / 1000;
  const log = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const name = `${sequence++}-${label}.log`;
  writeFileSync(join(output, name), log);
  const row = { label, seconds, status: res.status, log: name };
  results.rows.push(row);
  save();
  console.log(JSON.stringify(row));
  if (res.status !== 0) {
    console.error(log.slice(-16000));
    throw new Error(`${label} failed: ${res.error ?? res.status}`);
  }
  return { log, row };
}
function clone(name) {
  const dir = join(scratch, name);
  execFileSync("git", ["clone", "--shared", "--no-checkout", source, dir]);
  execFileSync("git", ["checkout", "--detach", base], { cwd: dir });
  return dir;
}
const turbo = (dir, args, env = cleanEnv) =>
  JSON.parse(
    execFileSync(
      join(dir, "node_modules/.bin/turbo"),
      [
        "run",
        ...args,
        "--dry=json",
        ...(args.some((arg) => arg.startsWith("--cache="))
          ? []
          : ["--cache=local:rw"]),
      ],
      { cwd: dir, env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    ),
  );
function fingerprints(dir, tasks) {
  const values = {};
  for (const task of tasks.filter((t) => t.command !== "<NONEXISTENT>")) {
    const dist = join(dir, task.directory, "dist");
    if (!existsSync(dist)) continue;
    const hash = createHash("sha256");
    for (const name of readdirSync(dist, { recursive: true }).sort()) {
      if (!/\.(?:[cm]?js|[cm]?ts|json|css)$/.test(name)) continue;
      hash
        .update(name)
        .update("\0")
        .update(readFileSync(join(dist, name)))
        .update("\0");
    }
    values[task.taskId] = hash.digest("hex");
  }
  return values;
}
const perfFilters = Object.keys(REF_PACKAGE_DIRS).map(
  (name) => `--filter=${name}`,
);
const installFilters = [
  "--filter=.",
  "--filter=@assistant-ui/react-devtools...",
  "--filter=@assistant-ui/x-performance...",
];

async function redis() {
  const dir = clone("redis");
  run(dir, "install", "pnpm", [
    "install",
    "--frozen-lockfile",
    ...installFilters,
  ]);
  const config = json(join(dir, "turbo.json"));
  const fingerprintsByVariant = [];
  for (const variant of sample % 2
    ? ["after", "before"]
    : ["before", "after"]) {
    const changed = structuredClone(config);
    if (variant === "after")
      changed.tasks.build.env = changed.tasks.build.env.filter(
        (name) => name !== "REDIS_*",
      );
    writeJson(join(dir, "turbo.json"), changed);
    writeJson(join(dir, "examples/with-resumable-stream/turbo.json"), {
      extends: ["//"],
      tasks: { build: { env: ["$TURBO_EXTENDS$", "REDIS_*"] } },
    });
    const cache = join(scratch, `redis-cache-${variant}`);
    const args = [
      "build",
      ...perfFilters,
      `--cache-dir=${cache}`,
      "--cache=local:rw",
    ];
    run(dir, `${variant}-prime-without-redis`, "pnpm", [
      "exec",
      "turbo",
      "run",
      ...args,
    ]);
    const before = turbo(dir, args, cleanEnv);
    const after = turbo(dir, args, redisEnv);
    const ids = (plan) => plan.tasks.map((t) => t.taskId).sort();
    assert.deepEqual(ids(before), ids(after));
    const hashes = (plan) =>
      Object.fromEntries(plan.tasks.map((t) => [t.taskId, t.hash]));
    if (variant === "after") assert.deepEqual(hashes(before), hashes(after));
    else assert.notDeepEqual(hashes(before), hashes(after));
    const initial = fingerprints(dir, before.tasks);
    run(
      dir,
      `${variant}-reuse-with-redis`,
      "pnpm",
      ["exec", "turbo", "run", ...args],
      redisEnv,
    );
    assert.deepEqual(fingerprints(dir, before.tasks), initial);
    run(
      dir,
      `${variant}-force-with-redis`,
      "pnpm",
      ["exec", "turbo", "run", ...args, "--force"],
      redisEnv,
    );
    assert.deepEqual(fingerprints(dir, before.tasks), initial);
    fingerprintsByVariant.push(initial);
    if (variant === "after") {
      for (const [task, name] of [
        ["test", "assistant-stream"],
        ["test", "@assistant-ui/docs"],
        ["build", "with-resumable-stream"],
      ]) {
        const a = turbo(dir, [task, `--filter=${name}`], cleanEnv).tasks.find(
          (t) => t.taskId === `${name}#${task}`,
        );
        const b = turbo(dir, [task, `--filter=${name}`], redisEnv).tasks.find(
          (t) => t.taskId === `${name}#${task}`,
        );
        assert.notEqual(a.hash, b.hash);
        assert(b.environmentVariables.specified.env.includes("REDIS_*"));
      }
    }
    results[variant] = {
      hashesWithoutRedis: hashes(before),
      hashesWithRedis: hashes(after),
      fingerprints: initial,
    };
    save();
  }
  assert.deepEqual(...fingerprintsByVariant);
  run(
    dir,
    "redis-integration-tests",
    "pnpm",
    [
      "-C",
      "packages/assistant-stream",
      "test",
      "src/resumable/stores/redis.test.ts",
    ],
    redisEnv,
  );
}

async function install() {
  const outputs = [];
  for (const variant of sample % 2
    ? ["after", "before"]
    : ["before", "after"]) {
    const store = join(scratch, `${variant}-store`);
    const env = { ...cleanEnv, PNPM_CONFIG_STORE_DIR: store };
    const filters = variant === "after" ? installFilters : [];
    const head = clone(`${variant}-head`);
    run(
      head,
      `${variant}-cold-head-install`,
      "pnpm",
      ["install", "--frozen-lockfile", ...filters],
      env,
    );
    run(
      head,
      `${variant}-head-build`,
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        ...perfFilters,
        "--cache=local:rw",
        `--cache-dir=${join(scratch, `${variant}-build-cache`)}`,
      ],
      env,
    );
    const plan = turbo(head, ["build", ...perfFilters], env);
    outputs.push(fingerprints(head, plan.tasks));
    run(
      head,
      `${variant}-warm-head-install`,
      "pnpm",
      ["install", "--frozen-lockfile", ...filters],
      env,
    );
    const ref = clone(`${variant}-ref`);
    run(
      ref,
      `${variant}-warm-store-ref-install`,
      "pnpm",
      ["install", "--frozen-lockfile", ...filters],
      env,
    );
    run(
      ref,
      `${variant}-ref-build`,
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        ...perfFilters,
        "--cache=local:rw",
        `--cache-dir=${join(scratch, `${variant}-ref-cache`)}`,
      ],
      env,
    );
    assert.deepEqual(fingerprints(ref, plan.tasks), outputs.at(-1));
    run(
      head,
      `${variant}-bench-smoke`,
      "pnpm",
      [
        "-C",
        "packages/x-performance",
        "exec",
        "vitest",
        "bench",
        "--run",
        "bench/accumulator.bench.ts",
      ],
      env,
    );
    run(
      head,
      `${variant}-trace-css`,
      "pnpm",
      [
        "-C",
        "packages/x-performance",
        "exec",
        "tailwindcss",
        "-i",
        "fixtures/shimmer.css",
        "-o",
        join(output, `${variant}-shimmer.css`),
      ],
      env,
    );
    const css = readFileSync(join(output, `${variant}-shimmer.css`), "utf8");
    results[variant] = {
      fingerprints: outputs.at(-1),
      cssHash: createHash("sha256").update(css).digest("hex"),
    };
    save();
    rmSync(head, { recursive: true });
    rmSync(ref, { recursive: true });
    rmSync(store, { recursive: true });
  }
  assert.deepEqual(...outputs);
  assert.equal(results.before.cssHash, results.after.cssHash);
}

async function scheduling() {
  const dir = clone("scheduling");
  run(dir, "install", "pnpm", ["install", "--frozen-lockfile"]);
  const config = json(join(dir, "turbo.json"));
  config.tasks.test.passThroughEnv = ["VITEST_MAX_WORKERS"];
  writeJson(join(dir, "turbo.json"), config);
  const geo = join(
    dir,
    "packages/ui/src/components/react/assistant-ui/elements/geo-map.test.tsx",
  );
  const old = readFileSync(geo, "utf8");
  const before =
    '    await waitFor(() => expect(leaflet.map).toHaveBeenCalledTimes(1));\n\n    expect(screen.queryByText("Outside")).toBeNull();\n    expect(leaflet.marker).toHaveBeenCalledTimes(1);';
  assert(old.includes(before));
  writeFileSync(
    geo,
    old.replace(
      before,
      '    await waitFor(() => {\n      expect(leaflet.map).toHaveBeenCalledTimes(1);\n      expect(leaflet.marker).toHaveBeenCalledTimes(1);\n    });\n\n    expect(screen.queryByText("Outside")).toBeNull();',
    ),
  );
  const seed = join(scratch, "seed-cache");
  const filters = [
    "--filter=@assistant-ui/ui",
    "--filter=@assistant-ui/docs",
    "--filter=@assistant-ui/tap",
  ];
  const plan = turbo(dir, ["test", ...filters], redisEnv);
  const buildFilters = [
    ...new Set(
      plan.tasks
        .filter((t) => t.task === "build")
        .map((t) => `--filter=${t.package}`),
    ),
  ];
  run(
    dir,
    "prebuild",
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "build",
      ...buildFilters,
      "--cache=local:rw",
      `--cache-dir=${seed}`,
    ],
    redisEnv,
  );
  run(
    dir,
    "prime-cached-test",
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "test",
      "--filter=@assistant-ui/tap",
      "--cache=local:rw",
      `--cache-dir=${seed}`,
    ],
    redisEnv,
  );
  const order =
    sample % 2
      ? ["after", "before", "before", "after"]
      : ["before", "after", "after", "before"];
  const summaries = [];
  for (const [index, variant] of order.entries()) {
    const cache = join(scratch, `test-cache-${index}`);
    cpSync(seed, cache, { recursive: true });
    const args = [
      "test",
      ...filters,
      "--cache=local:rw",
      `--cache-dir=${cache}`,
    ];
    const env =
      variant === "after" ? { ...redisEnv, VITEST_MAX_WORKERS: "2" } : redisEnv;
    const actual = turbo(dir, args, env);
    const taskHashes = Object.fromEntries(
      actual.tasks.map((t) => [t.taskId, t.hash]),
    );
    if (results.taskHashes) assert.deepEqual(taskHashes, results.taskHashes);
    results.taskHashes = taskHashes;
    const misses = actual.tasks.filter(
      (t) => t.command !== "<NONEXISTENT>" && t.cache.status !== "HIT",
    );
    assert.deepEqual(misses.map((t) => t.taskId).sort(), [
      "@assistant-ui/docs#test",
      "@assistant-ui/ui#test",
    ]);
    const { log } = run(
      dir,
      `${variant}-tests-${index}`,
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        ...args,
        `--concurrency=${variant === "after" ? 2 : 1}`,
      ],
      env,
    );
    const summary = stripVTControlCharacters(log)
      .split("\n")
      .filter((line) => /(?:Test Files|Tests)\s+\d+ passed/.test(line))
      .map((line) => line.trim().replace(/\s+\([^)]*\)\s*$/, ""))
      .sort();
    assert(summary.length >= 6);
    summaries.push(summary);
    results.rows.at(-1).summary = summary;
    save();
  }
  for (const summary of summaries) assert.deepEqual(summary, summaries[0]);
}

try {
  await { redis, install, scheduling }[mode]();
  results.verified = true;
} finally {
  save();
}
