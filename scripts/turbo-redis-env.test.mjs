import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("REDIS_")),
);
const plan = (extraEnv) => {
  const output = execFileSync(
    `${root}node_modules/.bin/turbo`,
    [
      "run",
      "build",
      "test",
      "--filter=./packages/*",
      "--filter=@assistant-ui/docs",
      "--filter=with-resumable-stream",
      "--dry=json",
    ],
    {
      cwd: root,
      env: { ...env, ...extraEnv },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  return new Map(JSON.parse(output).tasks.map((task) => [task.taskId, task]));
};
const withoutRedis = plan({});
const withRedis = plan({ REDIS_URL: "redis://127.0.0.1:6379" });

test("Redis configuration does not change library build cache keys", () => {
  const builds = [...withoutRedis.values()].filter(
    (task) => task.task === "build" && task.command === "aui-build",
  );
  assert(builds.length > 0);
  for (const task of builds) {
    assert.equal(withRedis.get(task.taskId).hash, task.hash, task.taskId);
  }
});

test("Redis configuration does not change the selected tasks", () => {
  assert.deepEqual([...withRedis.keys()], [...withoutRedis.keys()]);
});

for (const id of [
  "assistant-stream#test",
  "@assistant-ui/docs#test",
  "with-resumable-stream#build",
]) {
  test(`${id} retains Redis cache invalidation and environment access`, () => {
    const before = withoutRedis.get(id);
    const after = withRedis.get(id);
    assert(before && after);
    assert.notEqual(after.hash, before.hash);
    assert(after.environmentVariables.specified.env.includes("REDIS_*"));
    assert(
      after.environmentVariables.configured.some((value) =>
        value.startsWith("REDIS_URL="),
      ),
    );
  });
}

test("the resumable example retains inherited build environment inputs", () => {
  const inputs = withRedis.get("with-resumable-stream#build")
    .environmentVariables.specified.env;
  for (const name of ["OPENAI_*", "ASSISTANT_*", "SENTRY_*"]) {
    assert(inputs.includes(name), name);
  }
});
