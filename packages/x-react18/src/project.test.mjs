import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { declarationState } from "./project.mjs";

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "aui-react18-"));
  spawnSync("git", ["init", "-q"], { cwd });
  mkdirSync(join(cwd, "src"));
  mkdirSync(join(cwd, "dist"));
  writeFileSync(join(cwd, ".gitignore"), "dist\nsrc/generated.ts\n");
  for (const file of ["src/index.ts", "src/generated.ts", "dist/index.d.ts"]) {
    writeFileSync(join(cwd, file), "export {};\n");
  }
  const touch = (file, seconds) =>
    utimesSync(join(cwd, file), seconds, seconds);
  touch("src/index.ts", 1_000);
  touch("dist/index.d.ts", 2_000);
  return { cwd, touch };
}

test("a source git ignores, such as one a cache restore writes after dist, leaves dist fresh", () => {
  const { cwd, touch } = fixture();
  try {
    touch("src/generated.ts", 3_000);
    assert.equal(declarationState(cwd), "fresh");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a tracked source or a new one git doesn't ignore makes dist stale once it changes after dist", () => {
  const { cwd, touch } = fixture();
  try {
    spawnSync("git", ["add", "src/index.ts"], { cwd });
    assert.equal(declarationState(cwd), "fresh");
    touch("src/index.ts", 3_000);
    assert.equal(declarationState(cwd), "stale");
    touch("src/index.ts", 1_000);
    writeFileSync(join(cwd, "src/added.ts"), "export {};\n");
    touch("src/added.ts", 3_000);
    assert.equal(declarationState(cwd), "stale");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("dist without declarations is missing", () => {
  const { cwd } = fixture();
  try {
    rmSync(join(cwd, "dist/index.d.ts"));
    assert.equal(declarationState(cwd), "missing");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
