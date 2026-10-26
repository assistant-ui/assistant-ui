import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseReleaseLine, readChangesetSource } from "./lib/changesets.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { optionValues } from "./lib/script-options.mjs";
import { pendingChangesets } from "./pending-changesets.mjs";

const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 10_000;
const LOOKUP_TIMEOUT_MS = 15_000;

export function pendingSetupAgentChangesets(root) {
  return pendingChangesets(root).filter((file) => {
    const source = readChangesetSource(
      readFileSync(path.join(root, ".changeset", file), "utf8"),
    );
    return (source?.frontmatter ?? "")
      .split("\n")
      .some((line) => parseReleaseLine(line)?.name === "setup-agent");
  });
}

export function retryDelays(windowMs) {
  const delays = [];
  let total = 0;
  for (let delay = FIRST_RETRY_MS; total < windowMs;) {
    const next = Math.min(delay, windowMs - total);
    delays.push(next);
    total += next;
    delay = Math.min(delay * 2, MAX_RETRY_MS);
  }
  return delays;
}

async function lookupOnce(url, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    return `HTTP ${response.status}`;
  } catch (error) {
    return error.message;
  }
}

// A release reaches the registry a few minutes after publish, and a single
// registry error must not skip a deploy the guard would allow.
export async function lookupNpmVersion(
  version,
  {
    windowMs,
    fetch: fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
  },
) {
  const url = `https://registry.npmjs.org/setup-agent/${encodeURIComponent(version)}`;
  const deadline = now() + windowMs;
  let result = await lookupOnce(url, fetchImpl);
  for (const delay of retryDelays(windowMs)) {
    if (result === "HTTP 200") break;
    const remaining = deadline - now();
    if (remaining <= 0) break;
    await sleep(Math.min(delay, remaining));
    result = await lookupOnce(url, fetchImpl);
  }
  return result;
}

export async function checkSetupAgentReleased(root, options) {
  const pending = pendingSetupAgentChangesets(root);
  if (pending.length > 0) {
    return {
      released: false,
      reason: `pending setup-agent changesets (${pending.join(", ")}) mean the worker may need a CLI that is not on npm yet`,
    };
  }

  const { version } = JSON.parse(
    readFileSync(path.join(root, "packages/setup-agent/package.json"), "utf8"),
  );
  const result = await (options.lookup ?? lookupNpmVersion)(version, options);
  return result === "HTTP 200"
    ? { released: true, reason: `setup-agent@${version} is on npm` }
    : {
        released: false,
        reason: `setup-agent@${version} is not on npm (${result})`,
      };
}

export async function newestReleasedCommit(
  commits,
  { materialize, windowMs, fetch, sleep },
) {
  const lookups = new Map();
  const lookup = (version) => {
    if (!lookups.has(version)) {
      lookups.set(
        version,
        lookupNpmVersion(version, { windowMs, fetch, sleep }),
      );
    }
    return lookups.get(version);
  };
  for (const sha of commits) {
    const { released, reason } = await checkSetupAgentReleased(
      await materialize(sha),
      { lookup },
    );
    if (released) return { sha, reason };
  }
  return null;
}

export async function newestReleasedSince(
  sinceSha,
  {
    cwd = process.cwd(),
    windowMs,
    fetch,
    sleep,
    outputFile = process.env.GITHUB_OUTPUT,
  },
) {
  if (!/^[0-9a-f]{40}$/i.test(sinceSha)) {
    throw new Error("--newest-since must be a full 40-character commit SHA.");
  }
  const since = sinceSha.toLowerCase();
  const history = execFileSync(
    "git",
    ["-C", cwd, "rev-list", "--first-parent", "HEAD"],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n");
  const boundary = history.indexOf(since);
  if (boundary < 0) {
    throw new Error(`${since} is not on HEAD's first-parent chain.`);
  }

  const dirs = [];
  let found;
  try {
    found = await newestReleasedCommit(history.slice(0, boundary), {
      windowMs,
      fetch,
      sleep,
      materialize: (sha) => {
        const dir = mkdtempSync(path.join(tmpdir(), "aui-checkout-worker-"));
        dirs.push(dir);
        const archive = execFileSync(
          "git",
          [
            "-C",
            cwd,
            "archive",
            sha,
            ".changeset",
            "packages/setup-agent/package.json",
          ],
          { maxBuffer: 64 * 1024 * 1024 },
        );
        execFileSync("tar", ["-x", "-C", dir], { input: archive });
        return dir;
      },
    });
  } finally {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  }

  const sha = found?.sha ?? since;
  const reason =
    found?.reason ??
    `No released commit since ${since}; deploying the planned commit`;
  if (outputFile) {
    appendFileSync(
      outputFile,
      `sha=${sha}\nreason=${reason.replaceAll("\n", " ")}\n`,
    );
  }
  return { sha, reason };
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const args = process.argv.slice(2);
  const root = args.find((arg) => !arg.startsWith("--")) ?? ".";
  const windowMs = Number(optionValues(args, "--window-ms").at(-1) ?? 0);
  if (!Number.isSafeInteger(windowMs) || windowMs < 0) {
    throw new Error("--window-ms must be a non-negative integer.");
  }

  const since = optionValues(args, "--newest-since").at(-1);
  if (since !== undefined) {
    const { reason } = await newestReleasedSince(since, { windowMs });
    process.stdout.write(`${reason}\n`);
  } else {
    const { released, reason } = await checkSetupAgentReleased(root, {
      windowMs,
    });
    process.stdout.write(`${reason}\n`);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `released=${released}\nreason=${reason.replaceAll("\n", " ")}\n`,
      );
    }
  }
}
