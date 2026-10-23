import { appendFileSync, readFileSync } from "node:fs";
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
  },
) {
  const url = `https://registry.npmjs.org/setup-agent/${encodeURIComponent(version)}`;
  let result = await lookupOnce(url, fetchImpl);
  for (const delay of retryDelays(windowMs)) {
    if (result === "HTTP 200") break;
    await sleep(delay);
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
  const result = await lookupNpmVersion(version, options);
  return result === "HTTP 200"
    ? { released: true, reason: `setup-agent@${version} is on npm` }
    : {
        released: false,
        reason: `setup-agent@${version} is not on npm (${result})`,
      };
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const args = process.argv.slice(2);
  const root = args.find((arg) => !arg.startsWith("--")) ?? ".";
  const windowMs = Number(optionValues(args, "--window-ms").at(-1) ?? 0);
  if (!Number.isSafeInteger(windowMs) || windowMs < 0) {
    throw new Error("--window-ms must be a non-negative integer.");
  }

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
