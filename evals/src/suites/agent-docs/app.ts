import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
} from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { CheckFailure } from "./browser.ts";

export const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });

/**
 * The app is code the agent wrote, and its build and server run outside the
 * agent's sandbox, so they get a bare environment inside the trial folder: the
 * agent's small PATH, a throwaway HOME, and the trial's own npm config and
 * cache. They can still read files by absolute path, so run untrusted
 * suites on a machine or container that holds no secrets.
 */
const env = (trialDir: string): Record<string, string> => {
  // Absolute, because the commands run from the project folder.
  const runDir = resolve(trialDir);
  const home = join(runDir, "home");
  mkdirSync(home, { recursive: true });
  return {
    HOME: home,
    PATH: `${join(runDir, "bin")}:/usr/bin:/bin:/usr/sbin:/sbin`,
    TMPDIR: join(runDir, "tmp"),
    npm_config_cache: join(runDir, "npm-cache"),
    npm_config_userconfig: join(runDir, "npmrc"),
    LANG: "en_US.UTF-8",
    NEXT_TELEMETRY_DISABLED: "1",
  };
};

/** Runs `npm run <script>` in the project and throws `CheckFailure(step)` when it fails. */
export function npmRun(
  runDir: string,
  projectDir: string,
  script: string,
  log: string,
  step: string,
  timeoutMs = 600_000,
) {
  appendFileSync(log, `\n$ npm run ${script}\n`);
  const res = spawnSync("npm", ["run", script], {
    cwd: projectDir,
    env: env(runDir),
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  appendFileSync(log, `${res.stdout ?? ""}${res.stderr ?? ""}\n`);
  if (res.status !== 0) {
    const tail = `${res.stdout ?? ""}${res.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(-8)
      .join("\n");
    throw new CheckFailure(step, `exit ${res.status ?? res.signal}\n${tail}`);
  }
}

/** Builds the app the agent left, typechecks it, and serves it with `npm run start`. */
export async function buildAndStart(
  runDir: string,
  projectDir: string,
  log: string,
) {
  if (!existsSync(join(projectDir, "package.json"))) {
    throw new CheckFailure("has a project", "no package.json in the folder");
  }
  if (!existsSync(join(projectDir, "node_modules"))) {
    throw new CheckFailure(
      "has a project",
      "dependencies were never installed",
    );
  }
  npmRun(runDir, projectDir, "build", log, "builds");
  appendFileSync(log, "\n$ npx tsc --noEmit\n");
  const tsc = spawnSync("npx", ["--no-install", "tsc", "--noEmit"], {
    cwd: projectDir,
    env: env(runDir),
    encoding: "utf8",
    timeout: 300_000,
  });
  appendFileSync(log, `${tsc.stdout ?? ""}${tsc.stderr ?? ""}\n`);
  if (tsc.status !== 0) {
    throw new CheckFailure(
      "typechecks",
      `${tsc.stdout ?? ""}${tsc.stderr ?? ""}`
        .trim()
        .split("\n")
        .slice(0, 8)
        .join("\n"),
    );
  }

  const port = await freePort();
  const fd = openSync(log, "a");
  const server = spawn("npm", ["run", "start", "--", "-p", String(port)], {
    cwd: projectDir,
    env: { ...env(runDir), PORT: String(port) },
    stdio: ["ignore", fd, fd],
    detached: true,
  });
  closeSync(fd);
  const stop = () => {
    try {
      process.kill(-server.pid!, "SIGKILL");
    } catch {
      // Already stopped.
    }
  };
  const url = `http://127.0.0.1:${port}/`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return { url, stop };
    } catch {
      // Not up yet.
    }
    await sleep(500);
  }
  stop();
  throw new CheckFailure("starts", `npm run start didn't serve ${url}`);
}
