import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const script = path.join(import.meta.dirname, "check-pypi-dist.sh");
const sdist = "assistant_stream-1.2.3.tar.gz";
const wheel = "assistant_stream-1.2.3-py3-none-any.whl";

function distWith(entries) {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-pypi-dist-"));
  for (const [name, kind = "file"] of entries) {
    const target = path.join(dir, name);
    if (kind === "dir") mkdirSync(target);
    else if (kind === "link") {
      const elsewhere = mkdtempSync(path.join(tmpdir(), "aui-pypi-elsewhere-"));
      writeFileSync(path.join(elsewhere, name), "distribution\n");
      symlinkSync(path.join(elsewhere, name), target);
    } else writeFileSync(target, "distribution\n");
  }
  return dir;
}

const check = (dir, version = "1.2.3") =>
  spawnSync("bash", [script, dir, "assistant-stream", version], {
    encoding: "utf8",
  });

test("accepts the release's sdist and wheels", () => {
  const one = check(distWith([[sdist], [wheel]]));
  assert.equal(one.status, 0, one.stdout + one.stderr);
  assert.match(
    one.stdout,
    /Checked 2 distributions for assistant_stream-1\.2\.3\./,
  );

  const two = check(
    distWith([
      [sdist],
      [wheel],
      ["assistant_stream-1.2.3-cp312-cp312-manylinux_x86_64.whl"],
    ]),
  );
  assert.equal(two.status, 0, two.stdout + two.stderr);
});

test("rejects distributions for another version", () => {
  const result = check(distWith([[sdist], [wheel]]), "9.9.9");
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /Expected an sdist and a wheel for assistant_stream-9\.9\.9/,
  );
});

test("requires both an sdist and a wheel", () => {
  assert.equal(check(distWith([[sdist]])).status, 1);
  assert.equal(check(distWith([[wheel]])).status, 1);
  assert.equal(check(distWith([])).status, 1);
});

for (const [label, entry, message] of [
  [
    "a wheel of another project",
    ["evil-1.0.0-py3-none-any.whl"],
    /Unexpected file in the distributions: evil-1\.0\.0-py3-none-any\.whl/,
  ],
  [
    "a hidden file",
    [".pypirc"],
    /Unexpected file in the distributions: \.pypirc/,
  ],
  [
    "a directory named like a wheel",
    ["assistant_stream-1.2.3-py3-none-other.whl", "dir"],
    /Not a regular file: assistant_stream-1\.2\.3-py3-none-other\.whl/,
  ],
  [
    "a symlinked wheel",
    ["assistant_stream-1.2.3-py3-none-linked.whl", "link"],
    /Not a regular file: assistant_stream-1\.2\.3-py3-none-linked\.whl/,
  ],
]) {
  test(`rejects ${label}`, () => {
    const result = check(distWith([[sdist], [wheel], entry]));
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, message);
  });
}

test("rejects a symlinked sdist", () => {
  const result = check(distWith([[sdist, "link"], [wheel]]));
  assert.equal(result.status, 1, result.stdout);
  assert.match(
    result.stdout,
    /Not a regular file: assistant_stream-1\.2\.3\.tar\.gz/,
  );
});
