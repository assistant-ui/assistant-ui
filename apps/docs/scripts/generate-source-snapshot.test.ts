import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SNAPSHOT_BYTE_BUDGET } from "./source-snapshot-budget.mts";

const generator = path.join(
  import.meta.dirname,
  "generate-source-snapshot.mts",
);
let root: string;
let docs: string;
let output: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "aui-snapshot-"));
  docs = path.join(root, "apps/docs");
  output = path.join(docs, "generated/.repo-source");
  mkdirSync(docs, { recursive: true });
  writeFileSync(path.join(root, "source.txt"), "hello 🌱");
  writeFileSync(path.join(root, "image.png"), "excluded");
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "source.txt", "image.png"], { cwd: root });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function generate(...args: string[]) {
  return spawnSync(process.execPath, [generator, ...args], {
    cwd: docs,
    encoding: "utf8",
  });
}

it("checks the budget without creating or replacing output", () => {
  expect(generate("--check").status).toBe(0);
  expect(existsSync(path.join(docs, "generated"))).toBe(false);

  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, "source.txt"), "previous snapshot");
  expect(generate("--check").status).toBe(0);
  expect(readFileSync(path.join(output, "source.txt"), "utf8")).toBe(
    "previous snapshot",
  );
});

it("reports an over-budget snapshot without disturbing existing output", () => {
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, "previous.txt"), "keep");
  truncateSync(path.join(root, "source.txt"), SNAPSHOT_BYTE_BUDGET + 1);
  const result = generate("--check");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("across 1 files, over the");
  expect(result.stderr).toMatch(/Largest entries:\s+[\d.]+ MB  source\.txt/);
  expect(readdirSync(output)).toEqual(["previous.txt"]);
  expect(readFileSync(path.join(output, "previous.txt"), "utf8")).toBe("keep");
});

it("replaces stale output with filtered tracked sources by default", () => {
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, "stale.txt"), "old");
  expect(generate().status).toBe(0);
  expect(readdirSync(output)).toEqual(["source.txt"]);
  expect(readFileSync(path.join(output, "source.txt"), "utf8")).toBe(
    "hello 🌱",
  );
});
