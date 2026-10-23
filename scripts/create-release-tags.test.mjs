import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createReleaseTags,
  fetchPublishCommit,
  getChangelogEntry,
  readPublishablePackages,
} from "./create-release-tags.mjs";

const RELEASE_SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);

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

function makeGithub() {
  const calls = [];
  const tags = new Set();
  const releases = new Set();
  const notFound = () => Object.assign(new Error("not found"), { status: 404 });
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

const npmMetadata = (names) => async (name) =>
  names.includes(name) ? { versions: { "0.0.126": {}, "2.0.0": {} } } : null;

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
    github,
    getNpmMetadata: npmMetadata(["assistant-ui", "widget"]),
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
});

test("skips packages whose version is not on npm", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [{ name: "assistant-ui", version: "0.0.126" }],
    github,
    getNpmMetadata: npmMetadata([]),
    log: () => {},
  });
  assert.deepEqual(mutating(github), []);
});

test("rerun reconciles from the provenance attestation when the publish job skipped", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  github.tags.add("assistant-ui@0.0.126"); // tag from the first run
  await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: null,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    getPublishCommit: async () => RELEASE_SHA,
    log: () => {},
  });
  // Missing release retried; existing tag kept.
  assert.deepEqual(
    mutating(github).map(([kind]) => kind),
    ["createRelease"],
  );
});

test("back-to-back releases: a version published by another run's SHA is never retargeted", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: null,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    // The attestation names the earlier run's commit, not this RELEASE_SHA.
    getPublishCommit: async () => OTHER_SHA,
    log: () => {},
  });
  assert.deepEqual(mutating(github), []);
  assert.deepEqual(result.problems, []);
});

test("a version without a usable attestation is skipped, not guessed", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: null,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    getPublishCommit: async () => null,
    log: () => {},
  });
  assert.deepEqual(mutating(github), []);
});

test("an unreadable attestation is a problem, not a silent skip", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  const result = await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: null,
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    getPublishCommit: async () => {
      throw new Error("npm attestations HTTP 502");
    },
    log: () => {},
  });
  assert.deepEqual(mutating(github), []);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /attestation/);
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

test("an empty publish output is no fresh evidence: provenance fallback applies", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [], // rerun ran the publish job but had nothing to publish
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    getPublishCommit: async () => RELEASE_SHA,
    log: () => {},
  });
  assert.deepEqual(
    github.calls.filter(([kind]) => kind === "createRef"),
    [["createRef", "assistant-ui@0.0.126", RELEASE_SHA]],
  );
});

test("an empty publish output with non-matching provenance skips, never guesses", async () => {
  const packagesDir = makeWorkspace([
    ["cli", { name: "assistant-ui", version: "0.0.126" }],
  ]);
  const github = makeGithub();
  await createReleaseTags({
    packages: readPublishablePackages(packagesDir),
    releaseSha: RELEASE_SHA,
    publishedPackages: [],
    github,
    getNpmMetadata: npmMetadata(["assistant-ui"]),
    getPublishCommit: async () => OTHER_SHA,
    log: () => {},
  });
  assert.deepEqual(mutating(github), []);
});

// fetchPublishCommit attestation handling (registry responses are mocked; no
// network and no GitHub writes).
const SHA512_HEX = "ab".repeat(64);
const sha512Integrity = (hex) =>
  `sha512-${Buffer.from(hex, "hex").toString("base64")}`;

const attestationBody = ({ subjectName, gitCommit }) => ({
  attestations: [
    {
      predicateType: "https://slsa.dev/provenance/v1",
      bundle: {
        dsseEnvelope: {
          payload: Buffer.from(
            JSON.stringify({
              subject: [{ name: subjectName, digest: { sha512: SHA512_HEX } }],
              predicate: {
                buildDefinition: {
                  resolvedDependencies: [
                    {
                      uri: "git+https://github.com/assistant-ui/assistant-ui@refs/heads/main",
                      digest: { gitCommit },
                    },
                  ],
                },
              },
            }),
          ).toString("base64"),
        },
      },
    },
  ],
});

const withMockRegistry = async (body, fn) => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  });
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
};

const fetchCommit = (integrity = null) =>
  withMockRegistry(
    attestationBody({
      subjectName: "pkg:npm/assistant-ui@0.0.126",
      gitCommit: RELEASE_SHA,
    }),
    () =>
      fetchPublishCommit(
        "assistant-ui/assistant-ui",
        "assistant-ui",
        "0.0.126",
        integrity,
      ),
  );

test("provenance: a matching subject yields the publishing commit", async () => {
  assert.equal(await fetchCommit(), RELEASE_SHA);
  assert.equal(await fetchCommit(sha512Integrity(SHA512_HEX)), RELEASE_SHA);
});

test("provenance: an attestation for a different artifact is rejected", async () => {
  const commit = await withMockRegistry(
    attestationBody({
      subjectName: "pkg:npm/some-other-package@9.9.9",
      gitCommit: RELEASE_SHA,
    }),
    () =>
      fetchPublishCommit(
        "assistant-ui/assistant-ui",
        "assistant-ui",
        "0.0.126",
      ),
  );
  assert.equal(commit, null);
});

test("provenance: a tarball digest mismatch is rejected", async () => {
  const commit = await fetchCommit(sha512Integrity("cd".repeat(64)));
  assert.equal(commit, null);
});

test("provenance: no SLSA attestation means no association", async () => {
  const commit = await withMockRegistry({ attestations: [] }, () =>
    fetchPublishCommit("assistant-ui/assistant-ui", "assistant-ui", "0.0.126"),
  );
  assert.equal(commit, null);
});
