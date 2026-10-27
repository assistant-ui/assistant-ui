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
const OTHER_SHA = "b".repeat(40);
const noSleep = async () => {};

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
    writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify(manifest));
    if (withChangelog) {
      writeFileSync(
        path.join(pkgDir, "CHANGELOG.md"),
        changelog(manifest.version),
      );
    }
  }
  return packagesDir;
}

// Tags map a name to the ref object the GitHub API would return, so a tag
// pointing at the wrong commit - lightweight or annotated - is visible to the
// tests. `tagObjects` backs annotated-tag peeling: object sha -> git tag
// object whose `.object` is the tagged commit.
function makeGithub() {
  const calls = [];
  const tags = new Map();
  const tagObjects = new Map();
  const releases = new Set();
  const notFound = () => Object.assign(new Error("not found"), { status: 404 });
  return {
    calls,
    tags,
    tagObjects,
    releases,
    addTag: (tag, commitSha) =>
      tags.set(tag, { object: { sha: commitSha, type: "commit" } }),
    addAnnotatedTag: (tag, objectSha, commitSha) => {
      tags.set(tag, { object: { sha: objectSha, type: "tag" } });
      tagObjects.set(objectSha, {
        object: { sha: commitSha, type: "commit" },
      });
    },
    getRef: async (ref) => {
      const tag = ref.replace(/^tags\//, "");
      calls.push(["getRef", tag]);
      if (!tags.has(tag)) throw notFound();
      return tags.get(tag);
    },
    getTagObject: async (sha) => {
      calls.push(["getTagObject", sha]);
      if (!tagObjects.has(sha)) throw notFound();
      return tagObjects.get(sha);
    },
    createRef: async (ref, sha) => {
      const tag = ref.replace(/^refs\/tags\//, "");
      calls.push(["createRef", tag, sha]);
      tags.set(tag, { object: { sha, type: "commit" } });
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

// Registry metadata mock that records how often each package was read.
const npmMetadata =
  (names, calls = []) =>
  async (name) => {
    calls.push(name);
    return names.includes(name)
      ? { versions: { "0.0.126": {}, "2.0.0": {} } }
      : null;
  };

const mutating = (github) =>
  github.calls.filter(
    ([kind]) => kind === "createRef" || kind === "createRelease",
  );

test("creates tags and releases at the release SHA for this run's published packages", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
    ["widget", { name: "widget", version: "2.0.0" }],
  ]);
  const github = makeGithub();
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [
      { name: "assistant-ui", version: "0.0.126" },
      { name: "widget", version: "2.0.0" },
    ],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui", "widget"]),
    log: () => {},
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [
      ["createRef", "assistant-ui@0.0.126", RELEASE_SHA],
      ["createRef", "widget@2.0.0", RELEASE_SHA],
    ],
  );
  const release = github.calls.find(([kind]) => kind === "createRelease")[1];
  assert.equal(release.tag_name, "assistant-ui@0.0.126");
  assert.equal(release.target_commitish, RELEASE_SHA);
  assert.equal(release.prerelease, false);
  assert.match(release.body, /### Patch Changes/);
  assert.doesNotMatch(release.body, /0\.0\.1/);
});

test("a partial publish tags exactly the packages the step reported, no others", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
    ["widget", { name: "widget", version: "2.0.0" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    // The widget publish failed; only assistant-ui reached npm this run.
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui", "widget"]),
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
});

test("a published list without the publish job's checkout SHA is not evidence", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    log: () => {},
  });
  assert.equal(result.problems.length, 1);
  assert.deepEqual(mutating(github), []);
});

test("a publish checkout that is not the release SHA fails before any mutation", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const registryReads = [];
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: OTHER_SHA, // dispatch at RELEASE_SHA, publish run at OTHER_SHA
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"], registryReads),
    log: () => {},
  });
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /checking out/);
  assert.deepEqual(mutating(github), []);
  assert.deepEqual(registryReads, []); // nothing was even probed
});

test("a version the publish step reported but the registry hides is retried, then a failure", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const registryReads = [];
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata([], registryReads), // never becomes visible
    sleep: noSleep,
    log: () => {},
  });
  assert.deepEqual(mutating(github), []);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /registry/);
  assert.equal(registryReads.length, 5); // first read plus four retries
});

test("a reported version that appears on retry is tagged and released", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  let reads = 0;
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: async () => {
      reads += 1;
      return reads < 3 ? null : { versions: { "0.0.126": {} } };
    },
    sleep: noSleep,
    log: () => {},
  });
  assert.deepEqual(result.problems, []);
  assert.equal(reads, 3);
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
});

test("a version not published by this run is not retried against the registry", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
    ["widget", { name: "widget", version: "2.0.0" }],
  ]);
  const github = makeGithub();
  const registryReads = [];
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"], registryReads), // widget invisible
    sleep: noSleep,
    log: () => {},
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(registryReads, ["assistant-ui"]); // widget never probed
});

test("no recorded published list is a no-op, even for packages on npm", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const registryReads = [];
  for (const publishedPackages of [null, []]) {
    const result = await createReleaseTags({
      packages: readPublishablePackages(packagesDir),
      releaseSha: RELEASE_SHA,
      publishedPackages,
      github,
      getNpmMetadata: npmMetadata(["assistant-ui"], registryReads),
      log: () => {},
    });
    assert.deepEqual(result.problems, []);
  }
  assert.deepEqual(mutating(github), []);
  assert.deepEqual(registryReads, []); // nothing probed without fresh evidence
});

test("a rerun with no recorded list leaves a missing release alone", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  github.addTag("assistant-ui@0.0.126", RELEASE_SHA); // tag from the first run
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: null, // publish job skipped; its outputs are gone
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    log: () => {},
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(mutating(github), []); // the release is recreated by hand
});

test("an existing tag at the release SHA is kept, not recreated", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  github.addTag("assistant-ui@0.0.126", RELEASE_SHA);
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    log: () => {},
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [],
  );
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRelease").length,
    1,
  );
});

test("an existing tag at another commit fails the run; the tag is never moved", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  github.addTag("assistant-ui@0.0.126", OTHER_SHA); // stale tag from a bad run
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    log: () => {},
  });
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /never moved/);
  // No release is created on the wrong tag, and nothing mutates.
  assert.deepEqual(mutating(github), []);
  assert.equal(github.tags.get("assistant-ui@0.0.126").object.sha, OTHER_SHA);
});

test("an annotated tag is peeled to its commit before comparing", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
    ["widget", { name: "widget", version: "2.0.0" }],
  ]);
  const github = makeGithub();
  github.addAnnotatedTag("assistant-ui@0.0.126", "c".repeat(40), RELEASE_SHA);
  github.addAnnotatedTag("widget@2.0.0", "d".repeat(40), OTHER_SHA);
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [
      { name: "assistant-ui", version: "0.0.126" },
      { name: "widget", version: "2.0.0" },
    ],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui", "widget"]),
    log: () => {},
  });
  // The matching annotated tag gets its missing release; the mismatched one
  // is a problem and keeps its release untouched.
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /widget@2\.0\.0/);
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRelease").length,
    1,
  );
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "getTagObject"),
    [
      ["getTagObject", "c".repeat(40)],
      ["getTagObject", "d".repeat(40)],
    ],
  );
});

test("a missing changelog heading fails without leaving a partial tag", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  // The changelog has no section for 0.0.126.
  writeFileSync(
    path.join(packagesDir, "cli", "CHANGELOG.md"),
    changelog("9.9.9"),
  );
  const github = makeGithub();
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    log: () => {},
  });
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /changelog entry/);
  assert.deepEqual(mutating(github), []); // no tag, no release
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
      packages: readPublishablePackages(packagesDir),
      releaseSha: RELEASE_SHA,
      publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
      publishCheckoutSha: RELEASE_SHA,
      github,
      getNpmMetadata: npmMetadata(["assistant-ui"]),
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
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    publishCheckoutSha: RELEASE_SHA,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
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
