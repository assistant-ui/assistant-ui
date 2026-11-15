import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  findVendorProblems,
  readPackedManifest,
  runCheck,
} from "./check-vendored-tarballs.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const directory = "template/vendor";

// A minimal ustar archive with one regular file per entry.
function tar(entries) {
  const blocks = [];
  for (const [name, content] of Array.isArray(entries)
    ? entries
    : Object.entries(entries)) {
    const body = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100);
    header.write("0000644\0", 100);
    header.write("0000000\0", 108);
    header.write("0000000\0", 116);
    header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
    header.write("00000000000\0", 136);
    header.write("        ", 148);
    header.write("0", 156);
    header.write("ustar\0", 257);
    header.write("00", 263);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

const pack = (name, version) =>
  tar({
    "package/README.md": "readme",
    "package/package.json": JSON.stringify({ name, version }),
  });

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

function createRepo({ archives, artifacts, dependencies }) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-vendored-tarballs-"));
  const vendor = path.join(root, directory);
  mkdirSync(vendor, { recursive: true });
  for (const [file, buffer] of Object.entries(archives)) {
    writeFileSync(path.join(vendor, file), buffer);
  }
  writeFileSync(
    path.join(vendor, "provenance.json"),
    JSON.stringify({ artifacts }),
  );
  writeFileSync(
    path.join(root, "template/package.json"),
    JSON.stringify({ dependencies }),
  );
  return root;
}

function validRepo() {
  const archive = pack("demo", "1.0.0");
  return {
    archive,
    archives: { "demo-1.0.0.tgz": archive },
    artifacts: [
      {
        name: "demo",
        version: "1.0.0",
        filename: "demo-1.0.0.tgz",
        sha256: sha(archive),
      },
    ],
    dependencies: { demo: "file:vendor/demo-1.0.0.tgz", react: "^19.0.0" },
  };
}

function problemsFor(setup) {
  const root = createRepo(setup);
  try {
    return findVendorProblems(root, directory);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("reads the manifest out of a packed archive", () => {
  assert.deepEqual(readPackedManifest(pack("demo", "1.2.3")), {
    name: "demo",
    version: "1.2.3",
  });
  assert.equal(readPackedManifest(tar({ "package/x": "y" })), undefined);
});

test("rejects an archive that repeats its manifest", () => {
  const manifest = (version) => JSON.stringify({ name: "demo", version });
  const archive = tar([
    ["package/package.json", manifest("1.0.0")],
    ["package/package.json", manifest("6.6.6")],
  ]);
  assert.throws(() => readPackedManifest(archive), /more than one/);

  const setup = validRepo();
  setup.archives["demo-1.0.0.tgz"] = archive;
  setup.artifacts[0].sha256 = sha(archive);
  assert.deepEqual(problemsFor(setup), [
    `${directory}/demo-1.0.0.tgz is not a readable npm archive: it contains more than one package/package.json`,
  ]);
});

test("accepts archives that match their provenance", () => {
  assert.deepEqual(problemsFor(validRepo()), []);
});

test("rejects an archive whose hash differs from provenance", () => {
  const setup = validRepo();
  setup.archives["demo-1.0.0.tgz"] = pack("demo", "1.0.0-changed");
  setup.artifacts[0].version = "1.0.0";
  const problems = problemsFor(setup);
  assert.ok(problems.some((problem) => problem.includes("has sha256")));
});

test("rejects an archive that packs a different package", () => {
  const setup = validRepo();
  const other = pack("other", "1.0.0");
  setup.archives["demo-1.0.0.tgz"] = other;
  setup.artifacts[0].sha256 = sha(other);
  assert.deepEqual(problemsFor(setup), [
    `${directory}/demo-1.0.0.tgz packs other@1.0.0, but provenance.json records demo@1.0.0`,
  ]);
});

test("rejects archives missing from or absent in provenance", () => {
  const setup = validRepo();
  setup.archives["extra-1.0.0.tgz"] = pack("extra", "1.0.0");
  setup.artifacts.push({
    name: "gone",
    version: "1.0.0",
    filename: "gone-1.0.0.tgz",
    sha256: "0".repeat(64),
  });
  const problems = problemsFor(setup);
  assert.ok(
    problems.includes(
      `${directory}/gone-1.0.0.tgz is recorded in provenance.json but missing`,
    ),
  );
  assert.ok(
    problems.includes(
      `${directory}/extra-1.0.0.tgz is not recorded in provenance.json`,
    ),
  );
});

test("rejects a filename that leaves the vendor directory", () => {
  const setup = validRepo();
  setup.artifacts[0].filename = "../demo-1.0.0.tgz";
  const problems = problemsFor(setup);
  assert.ok(
    problems.some((problem) => problem.includes("invalid filename")),
    problems.join("\n"),
  );
});

test("rejects a manifest dependency on an unrecorded or mismatched archive", () => {
  const setup = validRepo();
  setup.dependencies.loose = "file:vendor/loose-1.0.0.tgz";
  setup.dependencies.renamed = "file:vendor/demo-1.0.0.tgz";
  const problems = problemsFor(setup);
  assert.ok(
    problems.some((problem) =>
      problem.includes("dependencies.loose points at file:vendor/loose"),
    ),
  );
  assert.ok(
    problems.some((problem) =>
      problem.includes("dependencies.renamed points at demo-1.0.0.tgz"),
    ),
  );
});

test("reports a missing template manifest", () => {
  const root = createRepo(validRepo());
  try {
    rmSync(path.join(root, "template/package.json"));
    const problems = findVendorProblems(root, directory);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^template\/package\.json: /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports a null provenance entry without throwing", () => {
  const setup = validRepo();
  setup.artifacts.push(null);
  setup.dependencies.other = "file:vendor/other-1.0.0.tgz";
  const problems = problemsFor(setup);
  assert.ok(problems.some((problem) => problem.includes("invalid filename")));
  assert.ok(problems.some((problem) => problem.includes("dependencies.other")));
});

test("the committed vendor directories match their provenance", () => {
  assert.equal(runCheck(repoRoot), true);
});
