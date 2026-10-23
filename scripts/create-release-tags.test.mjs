import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createReleaseTags,
  getChangelogEntry,
  readPublishablePackages,
} from "./create-release-tags.mjs";

const RELEASE_SHA = "a".repeat(40);
const RELEASE_COMMITTED_AT = "2026-10-20T12:00:00Z";
const RECENT = "2026-10-20T13:00:00Z";
const HISTORICAL = "2026-01-01T00:00:00Z";

const changelog = (version) => `# Changelog

## ${version}

### Patch Changes

- fix the thing

## 0.0.1

### Major Changes

- init
`;

function makeWorkspace(packages) {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-release-tags-"));
  const packagesDir = path.join(dir, "packages");
  for (const [dirName, manifest, withChangelog = true] of packages) {
    const pkgDir = path.join(packagesDir, dirName);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify(manifest),
    );
    if (withChangelog) {
      writeFileSync(
        path.join(pkgDir, "CHANGELOG.md"),
        changelog(manifest.version),
      );
    }
  }
  return packagesDir;
}

function makeGithub() {
  const calls = [];
  const tags = new Set();
  const releases = new Set();
  const notFound = () =>
    Object.assign(new Error("not found"), { status: 404 });
  return {
    calls,
    tags,
    releases,
    getRef: async (ref) => {
      const tag = ref.replace(/^tags\//, "");
      calls.push(["getRef", tag]);
      if (!tags.has(tag)) throw notFound();
    },
    createRef: async (ref, sha) => {
      const tag = ref.replace(/^refs\/tags\//, "");
      calls.push(["createRef", tag, sha]);
      tags.add(tag);
    },
    getReleaseByTag: async (tag) => {
      calls.push(["getReleaseByTag", tag]);
      if (!releases.has(tag)) throw notFound();
    },
    createRelease: async (release) => {
      calls.push(["createRelease", release]);
      releases.add(release.tag_name);
    },
  };
}

const npmMetadata = (entries) => async (name) => {
  const meta = entries[name];
  if (!meta) return null;
  return {
    versions: Object.fromEntries(meta.map(([v]) => [v, {}])),
    time: Object.fromEntries(meta),
  };
};

const basePackages = (packagesDir) => readPublishablePackages(packagesDir);

test("creates tags and releases at the release SHA with the changelog body", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const result = await createReleaseTags({
    packages: basePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    releaseCommittedAt: RELEASE_COMMITTED_AT,
    github,
    getNpmMetadata: npmMetadata({ "assistant-ui": [["0.0.126", RECENT]] }),
    log: () => {},
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
  const release = github.calls.find(([kind]) => kind === "createRelease")[1];
  assert.equal(release.tag_name, "assistant-ui@0.0.126");
  assert.equal(release.target_commitish, RELEASE_SHA);
  assert.equal(release.prerelease, false);
  assert.match(release.body, /### Patch Changes/);
  assert.doesNotMatch(release.body, /0\.0\.1/);
});

test("skips packages whose version is not on npm (partial publish)", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
    ["widget", { name: "widget", version: "2.0.0" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: basePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    releaseCommittedAt: RELEASE_COMMITTED_AT,
    github,
    getNpmMetadata: npmMetadata({ "assistant-ui": [["0.0.126", RECENT]] }),
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
});

test("rerun keeps existing tags and releases and retries only the missing release", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
    ["widget", { name: "widget", version: "2.0.0" }],
  ]);
  const github = makeGithub();
  github.tags.add("assistant-ui@0.0.126");
  github.tags.add("widget@2.0.0");
  github.releases.add("widget@2.0.0");
  await createReleaseTags({
    packages: basePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    releaseCommittedAt: RELEASE_COMMITTED_AT,
    github,
    getNpmMetadata: npmMetadata({
      "assistant-ui": [["0.0.126", RECENT]],
      widget: [["2.0.0", RECENT]],
    }),
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [],
  );
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRelease").map((c) => c[1].tag_name),
    ["assistant-ui@0.0.126"],
  );
});

test("never retargets a historical version's tag at the release SHA", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: basePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    releaseCommittedAt: RELEASE_COMMITTED_AT,
    github,
    getNpmMetadata: npmMetadata({ "assistant-ui": [["0.0.126", HISTORICAL]] }),
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef" || kind === "createRelease"),
    [],
  );
});

test("propagates release-creation errors instead of treating them as existing", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  github.createRelease = async () => {
    throw Object.assign(new Error("Validation Failed"), { status: 422 });
  };
  await assert.rejects(
    createReleaseTags({
      packages: basePackages(packagesDir),
      releaseSha: RELEASE_SHA,
      releaseCommittedAt: RELEASE_COMMITTED_AT,
      github,
      getNpmMetadata: npmMetadata({ "assistant-ui": [["0.0.126", RECENT]] }),
      log: () => {},
    }),
    /Validation Failed/,
  );
});

test("tags a package without a changelog but skips its release, like the action", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }, false],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: basePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    releaseCommittedAt: RELEASE_COMMITTED_AT,
    github,
    getNpmMetadata: npmMetadata({ "assistant-ui": [["0.0.126", RECENT]] }),
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRelease"),
    [],
  );
});

test("ignores private packages", async () => {
  const packagesDir = makeWorkspace([
    ["priv", { name: "private-thing", version: "1.0.0", private: true }],
  ]);
  assert.deepEqual(readPublishablePackages(packagesDir), []);
});

test("getChangelogEntry extracts exactly the version section", () => {
  const entry = getChangelogEntry(changelog("1.2.3"), "1.2.3");
  assert.match(entry, /### Patch Changes/);
  assert.doesNotMatch(entry, /## 0\.0\.1/);
  assert.equal(getChangelogEntry(changelog("1.2.3"), "9.9.9"), null);
});
