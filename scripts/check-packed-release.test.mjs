import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { checkPackedRelease } from "./check-packed-release.mjs";

const VERSION = "1.2.3";
const targets = [
  { name: "@fixture/a", version: VERSION },
  { name: "@fixture/b", version: VERSION },
];

function tarHeader({ name, size, type, linkname }) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100);
  header.write("0000644\0", 100);
  header.write("0000000\0", 108);
  header.write("0000000\0", 116);
  header.write(`${size.toString(8).padStart(11, "0")}\0`, 124);
  header.write("00000000000\0", 136);
  header.write("        ", 148);
  header.write(type, 156);
  header.write(linkname, 157, 100);
  header.write("ustar\0", 257);
  header.write("00", 263);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148);
  return header;
}

function tarGz(entries) {
  const blocks = [];
  for (const { name, content = "", type = "0", linkname = "" } of entries) {
    const data = type === "0" ? Buffer.from(content) : Buffer.alloc(0);
    blocks.push(tarHeader({ name, size: data.length, type, linkname }), data);
    blocks.push(Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

const manifest = (name, version = VERSION) => JSON.stringify({ name, version });

function release(name, overrides = {}) {
  const file = `${name.slice(1).replace("/", "-")}-${VERSION}.tgz`;
  return {
    kind: "publish",
    name,
    version: VERSION,
    access: "public",
    tag: "latest",
    tarball: { path: `packages/${file}`, integrity: "sha256-unchecked" },
    ...overrides,
  };
}

function createPackDir(releases, entriesFor = {}) {
  const packDir = mkdtempSync(path.join(tmpdir(), "aui-packed-release-"));
  mkdirSync(path.join(packDir, "packages"));
  for (const entry of releases) {
    const file = path.join(
      packDir,
      "packages",
      path.basename(entry.tarball.path),
    );
    const entries = entriesFor[entry.name] ?? [
      { name: "package/package.json", content: manifest(entry.name) },
      { name: "package/index.js", content: "export {};\n" },
    ];
    writeFileSync(file, tarGz(entries));
  }
  writeFileSync(
    path.join(packDir, "publish-plan.json"),
    JSON.stringify({ version: 1, plan: [releases] }),
  );
  return packDir;
}

const publishedOn =
  (published = []) =>
  async (name, version) =>
    published.includes(`${name}@${version}`);

const check = (packDir, options = {}) =>
  checkPackedRelease({
    packDir,
    targets: options.targets ?? targets,
    isPublished: publishedOn(options.published),
  });

test("keeps a plan that matches the release targets", async () => {
  const packDir = createPackDir([release("@fixture/a"), release("@fixture/b")]);
  const result = await check(packDir);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    result.document.plan.flat().map((entry) => entry.name),
    ["@fixture/a", "@fixture/b"],
  );
});

test("skips targets an earlier run published since the plan was packed", async () => {
  const packDir = createPackDir([release("@fixture/a"), release("@fixture/b")]);
  const partly = await check(packDir, { published: [`@fixture/a@${VERSION}`] });
  assert.deepEqual(partly.problems, []);
  assert.deepEqual(
    partly.document.plan.flat().map((entry) => entry.name),
    ["@fixture/b"],
  );

  const fully = await check(packDir, {
    published: [`@fixture/a@${VERSION}`, `@fixture/b@${VERSION}`],
  });
  assert.deepEqual(fully.problems, []);
  assert.deepEqual(fully.document.plan, []);
});

test("requires the plan to match the targets exactly", async () => {
  const extra = await check(
    createPackDir([
      release("@fixture/a"),
      release("@fixture/b"),
      release("@fixture/c"),
    ]),
  );
  assert.deepEqual(extra.problems, [
    `@fixture/c@${VERSION} is not a release target`,
  ]);

  const missing = await check(createPackDir([release("@fixture/a")]));
  assert.deepEqual(missing.problems, [`@fixture/b@${VERSION} is not packed`]);

  const publishedMissing = await check(createPackDir([release("@fixture/a")]), {
    published: [`@fixture/b@${VERSION}`],
  });
  assert.deepEqual(publishedMissing.problems, []);
});

test("rejects entries that publish another way than a target release", async () => {
  const result = await check(
    createPackDir([
      release("@fixture/a", { tag: "next" }),
      release("@fixture/b", { kind: "tag-only" }),
    ]),
  );
  assert.deepEqual(result.problems, [
    `@fixture/a@${VERSION} would publish with tag next and access public`,
    `@fixture/b@${VERSION} is a tag-only entry`,
    `@fixture/b@${VERSION} is not packed`,
  ]);

  const duplicate = await check(
    createPackDir([
      release("@fixture/a"),
      release("@fixture/b"),
      release("@fixture/a"),
    ]),
  );
  assert.deepEqual(duplicate.problems, ["@fixture/a is planned twice"]);
});

test("rejects a tarball outside the packed packages", async () => {
  const packDir = createPackDir([
    release("@fixture/a", { tarball: { path: "../a.tgz" } }),
    release("@fixture/b"),
  ]);
  const result = await check(packDir);
  assert.deepEqual(result.problems, [
    `@fixture/a@${VERSION} points at ../a.tgz, not a packed file`,
  ]);
});

test("rejects a tarball whose manifest names another package", async () => {
  const packDir = createPackDir(
    [release("@fixture/a"), release("@fixture/b")],
    {
      "@fixture/a": [
        { name: "package/package.json", content: manifest("@fixture/other") },
      ],
    },
  );
  const result = await check(packDir);
  assert.deepEqual(result.problems, [
    `@fixture/a@${VERSION} contains @fixture/other@${VERSION}`,
  ]);
});

for (const alias of [
  "./package/package.json",
  "package//package.json",
  "package/lib/../package.json",
  "package\\package.json",
  "package/package.json",
]) {
  test(`rejects a second manifest entry named ${alias}`, async () => {
    const packDir = createPackDir(
      [release("@fixture/a"), release("@fixture/b")],
      {
        "@fixture/a": [
          { name: "package/package.json", content: manifest("@fixture/a") },
          { name: alias, content: manifest("@fixture/a", "99.0.0") },
        ],
      },
    );
    const { problems } = await check(packDir);
    const prefix = `@fixture/a@${VERSION} has an entry pnpm could read under another path: `;
    assert.ok(
      problems.some((problem) => problem.startsWith(prefix)),
      problems.join("\n"),
    );
  });
}

test("rejects a manifest that is not a readable file", async () => {
  const packDir = createPackDir(
    [release("@fixture/a"), release("@fixture/b")],
    {
      "@fixture/a": [
        { name: "package/other.json", content: manifest("@fixture/a") },
        { name: "package/package.json", type: "2", linkname: "other.json" },
      ],
    },
  );
  const result = await check(packDir);
  assert.deepEqual(result.problems, [
    `@fixture/a@${VERSION} has no readable package/package.json`,
  ]);
});

test("leaves the plan file for the caller to rewrite", async () => {
  const packDir = createPackDir([release("@fixture/a"), release("@fixture/b")]);
  const before = readFileSync(path.join(packDir, "publish-plan.json"), "utf8");
  await check(packDir, { published: [`@fixture/a@${VERSION}`] });
  assert.equal(
    readFileSync(path.join(packDir, "publish-plan.json"), "utf8"),
    before,
  );
});
