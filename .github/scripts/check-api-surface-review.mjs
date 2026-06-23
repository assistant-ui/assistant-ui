import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export function listPackageJsonsFromTree(treeOutput) {
  return treeOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (file) => file.startsWith("packages/") && file.endsWith("/package.json"),
    )
    .sort();
}

export function flattenExportTargets(exportsField) {
  const targets = [];
  function visit(value) {
    if (typeof value === "string") {
      targets.push(value);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const nested of Object.values(value)) visit(nested);
  }
  visit(exportsField);
  return [...new Set(targets)];
}

export function distTargetToSourceCandidates(pkgDir, target) {
  if (!target.startsWith("./")) return [];
  if (target.includes("*")) {
    const srcPrefix = target
      .replace(/^\.\/dist\//, "src/")
      .replace(/^\.\/src\//, "src/");
    return [path.posix.join(pkgDir, srcPrefix.replace(/\*.*$/, ""))];
  }

  const normalized = target
    .replace(/^\.\/dist\//, "src/")
    .replace(/^\.\/src\//, "src/")
    .replace(/\.d\.(ts|cts|mts)$/, "")
    .replace(/\.(js|cjs|mjs)$/, "");

  const candidates = [
    `${normalized}.ts`,
    `${normalized}.tsx`,
    path.posix.join(normalized, "index.ts"),
    path.posix.join(normalized, "index.tsx"),
  ];

  return [
    ...new Set(
      candidates.map((candidate) => path.posix.join(pkgDir, candidate)),
    ),
  ];
}

export function derivePublicApiMatchers(
  packageJsonPath,
  packageJson,
  { exists = () => true } = {},
) {
  const pkgDir = path.posix.dirname(packageJsonPath);
  const fileSet = new Set([packageJsonPath]);
  const dirPrefixes = new Set();

  for (const target of flattenExportTargets(packageJson.exports)) {
    for (const candidate of distTargetToSourceCandidates(pkgDir, target)) {
      if (candidate.endsWith("/")) {
        dirPrefixes.add(candidate);
        continue;
      }
      if (candidate.includes("*")) {
        dirPrefixes.add(candidate.replace(/\*.*$/, ""));
        continue;
      }
      if (
        candidate.includes("/src/") &&
        !candidate.endsWith(".ts") &&
        !candidate.endsWith(".tsx")
      ) {
        dirPrefixes.add(candidate.endsWith("/") ? candidate : `${candidate}/`);
        continue;
      }
      if (exists(candidate)) {
        fileSet.add(candidate);
      }
    }
  }

  return {
    files: [...fileSet].sort(),
    directories: [...dirPrefixes].sort(),
  };
}

export function collectPublicApiMatchers(
  packageJsonEntries,
  packageJsonLoader,
  fileExists,
) {
  const files = new Set();
  const directories = new Set();

  for (const packageJsonPath of packageJsonEntries) {
    const packageJson = packageJsonLoader(packageJsonPath);
    if (!packageJson?.name || !packageJson?.exports) continue;
    const matchers = derivePublicApiMatchers(packageJsonPath, packageJson, {
      exists: fileExists,
    });
    for (const file of matchers.files) files.add(file);
    for (const directory of matchers.directories) directories.add(directory);
  }

  return {
    files: [...files].sort(),
    directories: [...directories].sort(),
  };
}

export function mergePublicApiMatchers(...matcherSets) {
  const files = new Set();
  const directories = new Set();

  for (const matchers of matcherSets) {
    for (const file of matchers.files) files.add(file);
    for (const directory of matchers.directories) directories.add(directory);
  }

  return {
    files: [...files].sort(),
    directories: [...directories].sort(),
  };
}

export function findApiSurfaceChanges(changedFiles, matchers) {
  return changedFiles.filter((file) => {
    if (matchers.files.includes(file)) return true;
    return matchers.directories.some((prefix) => file.startsWith(prefix));
  });
}

function parseNextPageUrl(linkHeader) {
  if (!linkHeader) return null;

  for (const part of linkHeader.split(",")) {
    const [rawUrl, rawRel] = part.split(";").map((value) => value.trim());
    if (rawRel !== 'rel="next"') continue;
    return rawUrl?.startsWith("<") && rawUrl.endsWith(">")
      ? rawUrl.slice(1, -1)
      : null;
  }

  return null;
}

export async function latestReviewStateByUser({
  repo,
  prNumber,
  token,
  fetchImpl = fetch,
}) {
  let nextUrl = `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews?per_page=100&page=1`;
  const latestByUser = new Map();

  while (nextUrl) {
    const response = await fetchImpl(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "assistant-ui-api-surface-check",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to load PR reviews: ${response.status} ${response.statusText}`,
      );
    }

    const reviews = await response.json();
    for (const review of reviews) {
      if (!review?.user?.login || review.state === "COMMENTED") continue;
      latestByUser.set(String(review.user.login).toLowerCase(), review.state);
    }

    nextUrl = parseNextPageUrl(response.headers.get("link"));
  }

  return latestByUser;
}

function runGitSync(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
}

async function runGit(args) {
  return runGitSync(args).stdout;
}

function repoRelativeExistsAtRevision(revision, relativePath) {
  return (
    runGitSync(["cat-file", "-e", `${revision}:${relativePath}`], {
      allowFailure: true,
    }).status === 0
  );
}

function loadPackageJsonAtRevision(revision, relativePath) {
  return JSON.parse(runGitSync(["show", `${revision}:${relativePath}`]).stdout);
}

async function main() {
  const {
    BASE_SHA,
    HEAD_SHA,
    PR_NUMBER,
    GITHUB_REPOSITORY,
    GITHUB_TOKEN,
    REQUIRED_REVIEWER = "Yonom",
  } = process.env;
  if (
    !BASE_SHA ||
    !HEAD_SHA ||
    !PR_NUMBER ||
    !GITHUB_REPOSITORY ||
    !GITHUB_TOKEN
  ) {
    throw new Error("Missing required environment for API surface check");
  }

  const basePackageJsonEntries = listPackageJsonsFromTree(
    await runGit(["ls-tree", "-r", "--name-only", BASE_SHA, "packages"]),
  );
  const headPackageJsonEntries = listPackageJsonsFromTree(
    await runGit(["ls-tree", "-r", "--name-only", HEAD_SHA, "packages"]),
  );

  const matchers = mergePublicApiMatchers(
    collectPublicApiMatchers(
      basePackageJsonEntries,
      (relativePath) => loadPackageJsonAtRevision(BASE_SHA, relativePath),
      (relativePath) => repoRelativeExistsAtRevision(BASE_SHA, relativePath),
    ),
    collectPublicApiMatchers(
      headPackageJsonEntries,
      (relativePath) => loadPackageJsonAtRevision(HEAD_SHA, relativePath),
      (relativePath) => repoRelativeExistsAtRevision(HEAD_SHA, relativePath),
    ),
  );

  const changedFiles = (
    await runGit(["diff", "--name-only", `${BASE_SHA}...${HEAD_SHA}`])
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const apiSurfaceChanges = findApiSurfaceChanges(changedFiles, matchers);
  if (apiSurfaceChanges.length === 0) {
    console.log("No public API surface entry changes detected.");
    return;
  }

  console.log("Detected public API surface entry changes:");
  for (const file of apiSurfaceChanges) console.log(`- ${file}`);

  const latestByUser = await latestReviewStateByUser({
    repo: GITHUB_REPOSITORY,
    prNumber: PR_NUMBER,
    token: GITHUB_TOKEN,
  });

  if (latestByUser.get(REQUIRED_REVIEWER.toLowerCase()) === "APPROVED") {
    console.log(`${REQUIRED_REVIEWER} has approved the API surface change.`);
    return;
  }

  throw new Error(
    `Public API surface entry changed, but @${REQUIRED_REVIEWER} has not approved the PR yet.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
