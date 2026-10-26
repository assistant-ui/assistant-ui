#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";

// changesets/action@v2.1.2 pins the tags and releases it creates to the run's
// GITHUB_SHA (pushTag uses context.sha, createRelease sets no
// target_commitish), which differs from the checked-out release commit
// whenever the default branch moved on. The workflow disables the action's
// own tag/release creation and reconciles both here instead, at RELEASE_SHA.
//
// The only trusted evidence is the publish job's own record: its published
// list plus the checkout it recorded, both kept across a "re-run failed
// jobs" rerun. npm provenance names a run's GITHUB_SHA, not the checked-out
// commit, so there is no fallback; a release with no list is tagged by hand.

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
      throw new Error(
        `npm registry HTTP ${response.status} for ${packageName}`,
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

// Resolves the commit a tag ref points at. Annotated tag objects are peeled
// until the underlying commit; returns null when the ref resolves to no
// commit (a depth guard keeps a tag-of-tag cycle from looping forever).
const resolveTagCommit = async (github, refObject) => {
  let object = refObject?.object;
  for (let depth = 0; depth < 5 && object?.type === "tag"; depth += 1) {
    object = (await github.getTagObject(object.sha))?.object;
  }
  return object?.type === "commit" ? object.sha : null;
};

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const isNotFound = (error) => error && error.status === 404;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The registry can lag behind a successful publish, so a reported version is
// retried (~100s, inside the job's timeout) before it is declared missing.
const REGISTRY_RETRY_DELAYS = [10_000, 20_000, 30_000, 40_000];

// Exactly the publishedPackages versions are tagged, and only while the
// recorded publish checkout equals releaseSha; with no list nothing is
// touched. github getters reject with a { status: 404 } error when missing.
export const createReleaseTags = async ({
  packages,
  releaseSha,
  publishedPackages,
  publishCheckoutSha = null,
  github,
  getNpmMetadata = fetchNpmMetadata,
  sleep = defaultSleep,
  log = console.log,
}) => {
  const problems = [];

  if (!publishedPackages?.length) {
    log(
      "No published package list recorded for this release; nothing to reconcile. A release published before this mechanism existed is tagged by hand.",
    );
    return { problems };
  }
  if (publishCheckoutSha !== releaseSha) {
    // The list names versions, but only the job that recorded the release
    // commit can associate them with it. Anything else would be inference.
    problems.push(
      publishCheckoutSha
        ? `The publish job recorded checking out ${publishCheckoutSha}, not the release commit ${releaseSha}; its published list is not evidence for this release. Reconcile these versions by re-running the failed jobs of that publish run.`
        : "The publish job reported published packages but did not record the commit it checked out; the list cannot be trusted as release evidence.",
    );
    return { problems };
  }

  for (const pkg of packages) {
    const tag = `${pkg.name}@${pkg.version}`;

    if (
      !publishedPackages.some(
        (entry) => entry.name === pkg.name && entry.version === pkg.version,
      )
    ) {
      log(`${tag} was not published by this run; skipping`);
      continue;
    }

    let metadata = await getNpmMetadata(pkg.name);
    let onRegistry = Boolean(metadata?.versions?.[pkg.version]);
    if (!onRegistry) {
      for (const delay of REGISTRY_RETRY_DELAYS) {
        log(
          `${tag} was published by this run but is not visible on npm yet; waiting`,
        );
        await sleep(delay);
        metadata = await getNpmMetadata(pkg.name);
        if (metadata?.versions?.[pkg.version]) {
          onRegistry = true;
          break;
        }
      }
    }
    if (!onRegistry) {
      problems.push(
        `${tag} was reported as published by the publish step but is still missing from the npm registry metadata; rerun this job once the registry settles.`,
      );
      continue;
    }

    let tagCommit = null;
    try {
      const ref = await github.getRef(`tags/${tag}`);
      tagCommit = await resolveTagCommit(github, ref);
      if (tagCommit === null) {
        problems.push(
          `Could not resolve the commit of the existing tag ${tag}`,
        );
        continue;
      }
    } catch (error) {
      if (isNotFound(error)) tagCommit = null;
      else throw error;
    }
    if (tagCommit !== null && tagCommit !== releaseSha) {
      problems.push(
        `Tag ${tag} already points at ${tagCommit}, not the release commit ${releaseSha}; published tags are never moved. Repair the tag manually if it is wrong.`,
      );
      continue;
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

    // The changelog entry is read before the tag is created, so a missing
    // heading fails the run without leaving a tag with no release. No
    // CHANGELOG.md still gets the tag but no release, matching the action.
    let body = null;
    if (fs.existsSync(pkg.changelogPath)) {
      body = getChangelogEntry(
        fs.readFileSync(pkg.changelogPath, "utf8"),
        pkg.version,
      );
      if (body == null) {
        problems.push(`Could not find changelog entry for ${tag}`);
        continue;
      }
    }

    if (tagCommit === null) {
      await github.createRef(`refs/tags/${tag}`, releaseSha);
      log(`Created tag ${tag} at ${releaseSha}`);
    }

    if (body === null) {
      log(`No CHANGELOG.md for ${pkg.name}; skipping release ${tag}`);
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
    getTagObject: (sha) =>
      request("GET", `/repos/${owner}/${repo}/git/tags/${sha}`),
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
    const publishCheckoutSha =
      (process.env.PUBLISH_CHECKOUT_SHA ?? "").trim() || null;
    const result = await createReleaseTags({
      packages: readPublishablePackages(path.resolve("packages")),
      releaseSha,
      publishedPackages,
      publishCheckoutSha,
      github: githubClient({
        token: process.env.GITHUB_TOKEN ?? "",
        owner,
        repo,
      }),
    });
    if (result.problems.length > 0) {
      for (const problem of result.problems) console.log(`::error::${problem}`);
      process.exitCode = 1;
    }
  }
}
