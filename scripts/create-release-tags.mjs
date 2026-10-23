#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";

// changesets/action@v2.1.2 pins the tags and releases it creates to the run's
// GITHUB_SHA (pushTag uses context.sha, createRelease sets no target_commitish),
// which differs from the checked-out release commit whenever the default branch
// moved on. The workflow disables the action's own tag/release creation and
// reconciles both here instead, at RELEASE_SHA.
//
// A version is only tagged/released here when its association with RELEASE_SHA
// is proven, never inferred from timestamps:
//  1. The publish step's `published-packages` output (set even when the step
//     fails partway through) names exactly the versions this run published
//     from the RELEASE_SHA checkout.
//  2. On reruns where the publish job skips (everything already on npm), the
//     package's SLSA provenance attestation on the npm registry names the
//     commit its publishing run ran against; it must equal RELEASE_SHA.
// Anything else is ambiguous and skipped with a warning naming the manual
// recovery path, instead of risking a tag pointed at the wrong commit.

// Port of getChangelogEntry from changesets/action@v2.1.2 (src/utils.ts), so
// release bodies keep the changelog entry the action would have used.
export const getChangelogEntry = (changelog, version) => {
  let headingStartInfo;
  let endIndex;
  const regex = /^(#{1,6})\s(.*)$|^(`{3,})/gm;
  let match;
  while ((match = regex.exec(changelog)) != null) {
    if (match[3]) {
      const endOfCodeBlockRegex = new RegExp(`^${match[3]}`, "gm");
      endOfCodeBlockRegex.lastIndex = regex.lastIndex;
      const endMatch = endOfCodeBlockRegex.exec(changelog);
      if (endMatch) {
        regex.lastIndex = endOfCodeBlockRegex.lastIndex;
        continue;
      }
      break;
    }
    const headingDepth = match[1].length;
    const headingText = match[2].trim();
    if (headingText === version) {
      headingStartInfo = { index: regex.lastIndex, depth: headingDepth };
      continue;
    }
    if (headingStartInfo && headingDepth === headingStartInfo.depth) {
      endIndex = match.index;
      break;
    }
  }
  if (!headingStartInfo) return null;
  return changelog.slice(headingStartInfo.index, endIndex).trim();
};

export const readPublishablePackages = (packagesDir) => {
  const packages = [];
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(packagesDir, entry.name, "package.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!manifest.name || !manifest.version || manifest.private) continue;
    packages.push({
      name: manifest.name,
      version: manifest.version,
      changelogPath: path.join(packagesDir, entry.name, "CHANGELOG.md"),
    });
  }
  return packages;
};

const fetchNpmMetadata = async (packageName) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      { signal: controller.signal },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`npm registry HTTP ${response.status} for ${packageName}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

// Reads the SLSA provenance attestation npm stores for trusted publishing and
// returns the git commit the publishing workflow run ran against, or null when
// there is no usable attestation.
const fetchPublishCommit = async (repository, packageName, version) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `https://registry.npmjs.org/-/npm/v1/attestations/${encodeURIComponent(packageName)}@${encodeURIComponent(version)}`,
      { signal: controller.signal },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `npm attestations HTTP ${response.status} for ${packageName}@${version}`,
      );
    }
    const data = await response.json();
    const attestation = (data.attestations ?? []).find(
      (entry) => entry.predicateType === "https://slsa.dev/provenance/v1",
    );
    const payload = attestation?.bundle?.dsseEnvelope?.payload;
    if (!payload) return null;
    const statement = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    const dependency = (
      statement?.predicate?.buildDefinition?.resolvedDependencies ?? []
    ).find((dep) =>
      (dep.uri ?? "").startsWith(`git+https://github.com/${repository}@`),
    );
    return dependency?.digest?.gitCommit ?? null;
  } finally {
    clearTimeout(timeout);
  }
};

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const isNotFound = (error) => error && error.status === 404;

// publishedPackages: the publish step's output when the publish job ran (the
// provable association for this run), or null when it skipped (rerun of an
// already-published release; the attestation binding applies instead).
// github: { getRef(ref), createRef(ref, sha), getReleaseByTag(tag), createRelease(release) }
// where getters reject with a { status: 404 } error when missing.
export const createReleaseTags = async ({
  packages,
  releaseSha,
  publishedPackages,
  github,
  getNpmMetadata = fetchNpmMetadata,
  getPublishCommit = null,
  log = console.log,
}) => {
  const problems = [];

  for (const pkg of packages) {
    const tag = `${pkg.name}@${pkg.version}`;

    const metadata = await getNpmMetadata(pkg.name);
    if (!metadata?.versions?.[pkg.version]) {
      log(`${tag} is not on npm; skipping`);
      continue;
    }

    if (publishedPackages) {
      const publishedHere = publishedPackages.some(
        (entry) => entry.name === pkg.name && entry.version === pkg.version,
      );
      if (!publishedHere) {
        log(`${tag} was not published by this run; skipping`);
        continue;
      }
    } else {
      let publishCommit = null;
      try {
        publishCommit = await getPublishCommit(pkg.name, pkg.version);
      } catch (error) {
        problems.push(
          `Could not read the provenance attestation for ${tag}: ${error.message}`,
        );
        continue;
      }
      if (publishCommit !== releaseSha) {
        log(
          `::warning::${tag} is on npm but its provenance does not name the release commit; leaving its tag and release untouched. Recover by re-running the failed jobs of the original publish run, or create the tag and release manually at the commit that published it.`,
        );
        continue;
      }
    }

    let tagExists = true;
    try {
      await github.getRef(`tags/${tag}`);
    } catch (error) {
      if (isNotFound(error)) tagExists = false;
      else throw error;
    }
    if (!tagExists) {
      await github.createRef(`refs/tags/${tag}`, releaseSha);
      log(`Created tag ${tag} at ${releaseSha}`);
    }

    let releaseExists = true;
    try {
      await github.getReleaseByTag(tag);
    } catch (error) {
      if (isNotFound(error)) releaseExists = false;
      else throw error;
    }
    if (releaseExists) {
      log(`Release ${tag} already exists; keeping it`);
      continue;
    }

    if (!fs.existsSync(pkg.changelogPath)) {
      // Matches changesets/action: no CHANGELOG.md means no GitHub release.
      log(`No CHANGELOG.md for ${pkg.name}; skipping release ${tag}`);
      continue;
    }
    const body = getChangelogEntry(
      fs.readFileSync(pkg.changelogPath, "utf8"),
      pkg.version,
    );
    if (body == null) {
      problems.push(`Could not find changelog entry for ${tag}`);
      continue;
    }

    await github.createRelease({
      tag_name: tag,
      name: tag,
      body,
      prerelease: pkg.version.includes("-"),
      target_commitish: releaseSha,
    });
    log(`Created release ${tag} targeting ${releaseSha}`);
  }

  return { problems };
};

const githubClient = ({ token, owner, repo }) => {
  const request = async (method, apiPath, body) => {
    const response = await fetch(`https://api.github.com${apiPath}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 404) {
      const error = new Error(`GitHub ${method} ${apiPath}: not found`);
      error.status = 404;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(
        `GitHub ${method} ${apiPath}: HTTP ${response.status} ${await response.text()}`,
      );
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };

  // Tag names can contain "/" (scoped packages), and the git ref route matches
  // the remainder of the path as the ref, so the ref itself stays unencoded.
  return {
    getRef: (ref) => request("GET", `/repos/${owner}/${repo}/git/ref/${ref}`),
    createRef: (ref, sha) =>
      request("POST", `/repos/${owner}/${repo}/git/refs`, { ref, sha }),
    getReleaseByTag: (tag) =>
      request(
        "GET",
        `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
      ),
    createRelease: (release) =>
      request("POST", `/repos/${owner}/${repo}/releases`, release),
  };
};

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const releaseSha = (process.env.RELEASE_SHA ?? "").trim();
  if (!/^[0-9a-f]{40}$/i.test(releaseSha)) {
    console.log(`::error::RELEASE_SHA is not a full commit SHA: ${releaseSha}`);
    process.exitCode = 1;
  } else if (git("rev-parse", "HEAD") !== releaseSha) {
    console.log("::error::Checked-out commit does not match RELEASE_SHA");
    process.exitCode = 1;
  } else {
    const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
    const publishedPackages = process.env.PUBLISHED_PACKAGES
      ? JSON.parse(process.env.PUBLISHED_PACKAGES)
      : null;
    const result = await createReleaseTags({
      packages: readPublishablePackages(path.resolve("packages")),
      releaseSha,
      publishedPackages,
      github: githubClient({
        token: process.env.GITHUB_TOKEN ?? "",
        owner,
        repo,
      }),
      getPublishCommit: (name, version) =>
        fetchPublishCommit(`${owner}/${repo}`, name, version),
    });
    if (result.problems.length > 0) {
      for (const problem of result.problems) console.log(`::error::${problem}`);
      process.exitCode = 1;
    }
  }
}
