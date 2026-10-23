import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkVersionPatch } from "./check-version-patch.mjs";

const manifest = (fields) => `${JSON.stringify(fields, null, 2)}\n`;

const packageB = {
  name: "@fixture/b",
  version: "0.1.0",
  dependencies: { "@fixture/a": "^1.0.0", "left-pad": "^1.3.0" },
  devDependencies: { "@fixture/a": "workspace:^1.0.0" },
  peerDependencies: { "@fixture/a": ">=1.0.0 <2.0.0" },
};

const versionedB = {
  ...packageB,
  version: "0.1.1",
  dependencies: { "@fixture/a": "^1.0.1", "left-pad": "^1.3.0" },
  devDependencies: { "@fixture/a": "workspace:^1.0.1" },
  peerDependencies: { "@fixture/a": ">=1.0.1 <2.0.0" },
};

const files = {
  "package.json": '{ "name": "root", "private": true }\n',
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  ".changeset/config.json": "{}\n",
  ".changeset/brave-fox.md": '---\n"@fixture/a": patch\n---\n\nfix: a thing\n',
  "packages/a/package.json": '{ "name": "@fixture/a", "version": "1.0.0" }\n',
  "packages/a/CHANGELOG.md": "# @fixture/a\n",
  "packages/a/src/index.js": "export {};\n",
  "packages/b/package.json": manifest(packageB),
};

function createRepo() {
  const repo = mkdtempSync(path.join(tmpdir(), "aui-version-patch-"));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: repo,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
      },
    });
  git("init", "--quiet");
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.join(repo, path.dirname(file)), { recursive: true });
    writeFileSync(path.join(repo, file), content);
  }
  git("add", "--all");
  git(
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit",
    "--quiet",
    "--message",
    "base",
  );
  return { repo, git };
}

function patchOf(change) {
  const { repo, git } = createRepo();
  change((file) => path.join(repo, file), git);
  git("add", "--all");
  const patch = path.join(repo, "..", `${path.basename(repo)}.patch`);
  writeFileSync(patch, git("diff", "--cached", "--binary"));
  git("reset", "--quiet", "--hard");
  git("clean", "--quiet", "-fd");
  return { repo, patch };
}

const check = ({ repo, patch }) => checkVersionPatch(patch, { cwd: repo });

const versionPackages = (at) => {
  writeFileSync(
    at("packages/a/package.json"),
    '{ "name": "@fixture/a", "version": "1.0.1" }\n',
  );
  writeFileSync(
    at("packages/a/CHANGELOG.md"),
    "# @fixture/a\n\n## 1.0.1\n\n- fix: a thing\n",
  );
  writeFileSync(at("packages/b/package.json"), manifest(versionedB));
  writeFileSync(at("packages/b/CHANGELOG.md"), "# @fixture/b\n\n## 0.1.1\n");
  writeFileSync(at("pnpm-lock.yaml"), "lockfileVersion: '9.0'\n# updated\n");
  rmSync(at(".changeset/brave-fox.md"));
};

test("accepts what changeset version writes", () => {
  assert.deepEqual(check(patchOf(versionPackages)), []);
});

test("rejects manifest edits beyond versions and released dependency ranges", () => {
  const editB = (fields) =>
    check(
      patchOf((at) => {
        versionPackages(at);
        writeFileSync(
          at("packages/b/package.json"),
          manifest({ ...versionedB, ...fields }),
        );
      }),
    );
  const changes = (field, name) =>
    `The version patch changes ${field}${name ? `.${name}` : ""} in packages/b/package.json`;

  assert.deepEqual(editB({ scripts: { prepare: "node evil.js" } }), [
    changes("scripts"),
  ]);
  assert.deepEqual(
    editB({
      dependencies: { ...versionedB.dependencies, "left-pad": "^1.3.1" },
    }),
    [changes("dependencies", "left-pad")],
  );
  assert.deepEqual(
    editB({ dependencies: { ...versionedB.dependencies, evil: "^1.0.0" } }),
    [changes("dependencies", "evil")],
  );
  assert.deepEqual(
    editB({
      dependencies: {
        ...versionedB.dependencies,
        "@fixture/a": "npm:evil@1.0.1",
      },
    }),
    [changes("dependencies", "@fixture/a")],
  );
  assert.deepEqual(
    editB({ peerDependencies: { "@fixture/a": "^1.0.1 || ^9.0.0" } }),
    [changes("peerDependencies", "@fixture/a")],
  );
  assert.deepEqual(
    editB({
      dependencies: { ...versionedB.dependencies, "@fixture/a": "^11.0.10" },
    }),
    [changes("dependencies", "@fixture/a")],
  );
  assert.deepEqual(editB({ optionalDependencies: 5 }), [
    changes("optionalDependencies"),
  ]);
  assert.deepEqual(editB({ version: "latest" }), [
    "The version patch sets an invalid version in packages/b/package.json",
  ]);

  const unreleased = check(
    patchOf((at) =>
      writeFileSync(at("packages/b/package.json"), manifest(versionedB)),
    ),
  );
  assert.deepEqual(unreleased, [
    changes("dependencies", "@fixture/a"),
    changes("devDependencies", "@fixture/a"),
    changes("peerDependencies", "@fixture/a"),
  ]);

  const invalid = check(
    patchOf((at) => writeFileSync(at("packages/a/package.json"), "{ nope\n")),
  );
  assert.deepEqual(invalid, [
    "The version patch makes packages/a/package.json invalid JSON",
  ]);
});

test("rejects a change to any other file", () => {
  const result = check(
    patchOf((at) => {
      versionPackages(at);
      writeFileSync(
        at("packages/a/src/index.js"),
        "export const injected = true;\n",
      );
    }),
  );
  assert.deepEqual(result, [
    "The version patch changes packages/a/src/index.js",
  ]);
});

test("rejects new files other than a changelog", () => {
  const result = check(
    patchOf((at) => {
      writeFileSync(at("packages/a/postinstall.js"), "console.log(1);\n");
      mkdirSync(at(".github/workflows"), { recursive: true });
      writeFileSync(at(".github/workflows/release.yaml"), "on: push\n");
    }),
  );
  assert.deepEqual(result.toSorted(), [
    "The version patch changes .github/workflows/release.yaml",
    "The version patch changes packages/a/postinstall.js",
    "The version patch may not create .github/workflows/release.yaml",
    "The version patch may not create packages/a/postinstall.js",
  ]);
});

test("rejects editing a changeset instead of consuming it", () => {
  const result = check(
    patchOf((at) => writeFileSync(at(".changeset/brave-fox.md"), "---\n---\n")),
  );
  assert.deepEqual(result, [
    "The version patch changes .changeset/brave-fox.md",
  ]);
});

test("rejects deleting anything but a changeset", () => {
  const result = check(patchOf((at) => rmSync(at("packages/a/src/index.js"))));
  assert.deepEqual(result, [
    "The version patch may not delete packages/a/src/index.js",
    "The version patch changes packages/a/src/index.js",
  ]);
});

test("rejects renames, mode changes and symlinks", () => {
  const renamed = check(
    patchOf((at) =>
      renameSync(at("packages/a/CHANGELOG.md"), at("packages/a/HISTORY.md")),
    ),
  );
  assert.ok(
    renamed.some((problem) => problem.includes("rename")),
    renamed.join("\n"),
  );

  const executable = check(
    patchOf((at) => chmodSync(at("packages/a/package.json"), 0o755)),
  );
  assert.ok(
    executable.some((problem) => problem.includes("mode change")),
    executable.join("\n"),
  );

  const linked = check(
    patchOf((at) =>
      symlinkSync("../a/CHANGELOG.md", at("packages/b/CHANGELOG.md")),
    ),
  );
  assert.ok(
    linked.includes("The version patch may not create packages/b/CHANGELOG.md"),
    linked.join("\n"),
  );
});

test("rejects binary content", () => {
  const result = check(
    patchOf((at) =>
      writeFileSync(at("pnpm-lock.yaml"), Buffer.from([0, 1, 2, 3, 0])),
    ),
  );
  assert.deepEqual(result, [
    "The version patch changes binary file pnpm-lock.yaml",
  ]);
});

test("rejects a patch made against another commit", () => {
  const { patch } = patchOf(versionPackages);
  const { repo, git } = createRepo();
  writeFileSync(
    path.join(repo, "packages/a/package.json"),
    '{ "name": "@fixture/a", "version": "2.0.0" }\n',
  );
  git(
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit",
    "--quiet",
    "--all",
    "--message",
    "moved on",
  );
  assert.deepEqual(checkVersionPatch(patch, { cwd: repo }), [
    "The version patch does not apply to this commit.",
  ]);
});
