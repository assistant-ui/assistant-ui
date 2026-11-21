import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/codeql.yaml", import.meta.url),
  "utf8",
);
const job = workflow.match(/\n  prune-overlay-databases:\n[\s\S]*$/)[0];
const prune = job
  .match(
    /      - name: Delete all but the newest overlay-base database\n[\s\S]*?        run: \|\n([\s\S]*)$/,
  )[1]
  .replace(/^          /gm, "");

const sha = (digit) => digit.repeat(40);
const javascript =
  "codeql-overlay-base-database-1-4310f50b27b109c8-javascript-2.27.4-";
const python = "codeql-overlay-base-database-1-e1b4d26429713824-python-2.27.4-";
const olderCli =
  "codeql-overlay-base-database-1-4310f50b27b109c8-javascript-2.27.3-";

function run(t, caches, { missing = [], failing = [] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-codeql-prune-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (let offset = 0; offset < caches.length; offset += 100) {
    writeFileSync(
      path.join(root, `page-${offset / 100 + 1}.json`),
      JSON.stringify({
        total_count: caches.length,
        actions_caches: caches.slice(offset, offset + 100),
      }),
    );
  }
  writeFileSync(path.join(root, "deleted"), "");
  writeFileSync(path.join(root, "requests"), "");
  writeFileSync(path.join(root, "calls"), "");
  const gh = path.join(root, "gh");
  writeFileSync(
    gh,
    `#!/usr/bin/env bash
set -euo pipefail
dir=$(dirname "$0")
echo "$*" >> "$dir/calls"
if [ "$1 $2" = "api --paginate" ]; then
  echo "$3" >> "$dir/requests"
  page=1
  while [ -f "$dir/page-$page.json" ]; do
    jq -c "$5" "$dir/page-$page.json"
    page=$((page + 1))
  done
elif [ "$1" = "api" ] && [ "\${3-}" = "--jq" ]; then
  echo "$2" >> "$dir/requests"
  jq -c "$4" "$dir/page-1.json"
elif [ "$1 $2 $3" = "api --method DELETE" ]; then
  id=\${4##*/}
  case " ${missing.join(" ")} " in *" $id "*) echo "gh: Not Found (HTTP 404)" >&2; exit 1 ;; esac
  case " ${failing.join(" ")} " in *" $id "*) echo "gh: Server Error (HTTP 500)" >&2; exit 1 ;; esac
  echo "$id" >> "$dir/deleted"
else
  echo "unexpected gh $*" >&2
  exit 2
fi
`,
  );
  chmodSync(gh, 0o755);
  const result = spawnSync("bash", ["-c", prune], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${root}${path.delimiter}${process.env.PATH}`,
      GITHUB_REPOSITORY: "assistant-ui/assistant-ui",
      GITHUB_REF: "refs/heads/main",
    },
  });
  const lines = (file) =>
    readFileSync(path.join(root, file), "utf8").split("\n").filter(Boolean);
  return {
    ...result,
    deleted: lines("deleted").map(Number),
    requests: lines("requests"),
    calls: lines("calls"),
  };
}

function assertCalls(result, deletedIds) {
  assert.equal(
    result.calls[0],
    "api --paginate repos/assistant-ui/assistant-ui/actions/caches?ref=refs/heads/main&key=codeql-overlay-base-database-&per_page=100 --jq .actions_caches[] | {id, key, created_at}",
  );
  assert.deepEqual(
    result.calls.slice(1).sort(),
    deletedIds
      .map(
        (id) =>
          `api --method DELETE repos/assistant-ui/assistant-ui/actions/caches/${id}`,
      )
      .sort(),
  );
}

const entry = (id, prefix, digit, createdAt) => ({
  id,
  key: `${prefix}${sha(digit)}-4300${id}-1`,
  created_at: createdAt,
  size_in_bytes: 836_000_000,
});

test("keeps only the newest overlay-base database per language and CodeQL version", (t) => {
  const result = run(t, [
    entry(1, javascript, "a", "2026-11-11T08:15:35Z"),
    entry(2, javascript, "b", "2026-11-11T11:00:43Z"),
    entry(3, javascript, "c", "2026-11-11T09:39:15Z"),
    entry(4, python, "a", "2026-11-11T08:05:07Z"),
    entry(5, python, "b", "2026-11-11T10:50:33Z"),
    entry(6, olderCli, "a", "2026-11-04T08:00:00Z"),
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.deleted.sort(), [1, 3, 4]);
  assert.deepEqual(result.requests, [
    "repos/assistant-ui/assistant-ui/actions/caches?ref=refs/heads/main&key=codeql-overlay-base-database-&per_page=100",
  ]);
  assertCalls(result, [1, 3, 4]);
});

test("prunes superseded databases beyond the first cache page", (t) => {
  const fillers = Array.from({ length: 198 }, (_, index) =>
    entry(
      1000 + index,
      `codeql-overlay-base-database-1-4310f50b27b109c8-filler${index}-2.27.4-`,
      "f",
      "2026-11-11T08:00:00Z",
    ),
  );
  const result = run(t, [
    entry(1, javascript, "a", "2026-11-11T11:00:00Z"),
    ...fillers.slice(0, 99),
    entry(2, javascript, "b", "2026-11-11T08:00:00Z"),
    ...fillers.slice(99),
    entry(3, python, "a", "2026-11-11T08:00:00Z"),
    entry(4, python, "b", "2026-11-11T11:00:00Z"),
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.deleted.sort(), [2, 3]);
  assertCalls(result, [2, 3]);
});

test("deletes nothing when each group holds one database", (t) => {
  const result = run(t, [
    entry(1, javascript, "a", "2026-11-11T08:15:35Z"),
    entry(2, python, "a", "2026-11-11T08:05:07Z"),
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.deleted, []);
  assertCalls(result, []);
});

test("leaves keys in an unknown format in place and warns", (t) => {
  const result = run(t, [
    {
      id: 7,
      key: `${javascript}unexpected`,
      created_at: "2026-11-10T00:00:00Z",
    },
    {
      id: 8,
      key: `${javascript}also-unexpected`,
      created_at: "2026-11-11T00:00:00Z",
    },
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.deleted, []);
  assertCalls(result, []);
  assert.match(
    result.stdout,
    /::warning::Left codeql-overlay-base-database-1-4310f50b27b109c8-javascript-2\.27\.4-unexpected in place/,
  );
});

test("treats a database another prune already deleted as done", (t) => {
  const result = run(
    t,
    [
      entry(1, javascript, "a", "2026-11-11T08:15:35Z"),
      entry(2, javascript, "b", "2026-11-11T09:00:00Z"),
      entry(3, javascript, "c", "2026-11-11T10:00:00Z"),
    ],
    { missing: [1] },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.deleted, [2]);
  assertCalls(result, [1, 2]);
});

test("fails on any other deletion error", (t) => {
  const result = run(
    t,
    [
      entry(1, javascript, "a", "2026-11-11T08:15:35Z"),
      entry(2, javascript, "b", "2026-11-11T09:00:00Z"),
    ],
    { failing: [1] },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HTTP 500/);
  assertCalls(result, [1]);
});

test("the prune runs after every analysis outside pull requests with only cache access", () => {
  assert.match(job, /\n    needs: analyze\n/);
  assert.match(
    job,
    /\n    if: always\(\) && github\.event_name != 'pull_request'\n/,
  );
  assert.match(job, /\n    permissions:\n      actions: write\n    steps:\n/);
});
