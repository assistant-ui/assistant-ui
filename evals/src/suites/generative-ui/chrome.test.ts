import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs, { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openChromePage, waitForDevToolsPort } from "./chrome.ts";

test("reports a spawn error and removes its profile without timing out", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "aui-eval-failed-spawn-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const chrome = join(dir, "chrome");
  writeFileSync(chrome, "not an executable", { mode: 0o644 });
  const previous = process.env.CHROME_PATH;
  process.env.CHROME_PATH = chrome;
  t.after(() => {
    if (previous === undefined) delete process.env.CHROME_PATH;
    else process.env.CHROME_PATH = previous;
  });

  let spawnError: Error | undefined;
  let profile: string | undefined;
  let profileExistedAtClose = false;
  t.after(() => {
    if (profile) rmSync(profile, { recursive: true, force: true });
  });
  const spawn = childProcess.spawn;
  const spawned = t.mock.method(
    childProcess,
    "spawn",
    (...args: Parameters<typeof spawn>) => {
      const child = spawn(...args);
      profile = child.spawnargs
        .find((arg) => arg.startsWith("--user-data-dir="))
        ?.slice("--user-data-dir=".length);
      child.once("error", (error) => {
        spawnError = error;
      });
      child.once("close", () => {
        profileExistedAtClose = !!profile && fs.existsSync(profile);
      });
      return child;
    },
  );
  syncBuiltinESMExports();
  t.after(() => {
    spawned.mock.restore();
    syncBuiltinESMExports();
  });

  const setTimeout = globalThis.setTimeout;
  const expiredTimeouts: number[] = [];
  t.mock.method(globalThis, "setTimeout", (callback: () => void, ms: number) =>
    setTimeout(() => {
      expiredTimeouts.push(ms);
      callback();
    }, ms),
  );

  await assert.rejects(openChromePage("about:blank", 680), (error: Error) => {
    assert.ok(spawnError);
    assert.equal(
      error.message,
      `Chrome could not be launched (${spawnError.message}) (${chrome}).`,
    );
    return true;
  });
  assert.deepEqual(expiredTimeouts, []);
  assert.ok(profileExistedAtClose);
  assert.ok(profile);
  assert.equal(fs.existsSync(profile), false);
});

test(
  "reports how Chrome failed to start, with the end of its log",
  { skip: process.platform === "win32" ? "needs a shell script" : false },
  async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "aui-eval-fake-chrome-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const chrome = join(dir, "chrome");
    writeFileSync(
      chrome,
      "#!/bin/sh\necho 'No usable sandbox!' >&2\nexit 3\n",
      {
        mode: 0o755,
      },
    );
    const previous = process.env.CHROME_PATH;
    process.env.CHROME_PATH = chrome;
    t.after(() => {
      if (previous === undefined) delete process.env.CHROME_PATH;
      else process.env.CHROME_PATH = previous;
    });

    const started = Date.now();
    await assert.rejects(openChromePage("about:blank", 680), {
      message: `Chrome exited with 3 before it started (${chrome}):\nNo usable sandbox!`,
    });
    assert.ok(
      Date.now() - started < 5_000,
      "fails without waiting out the timeout",
    );
  },
);

for (const prefix of ["", "42"]) {
  test(`waits for Chrome's port record after ${prefix ? "an incomplete" : "an empty"} read`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "aui-eval-port-record-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const portFile = join(dir, "DevToolsActivePort");
    writeFileSync(portFile, "4242\n/devtools/browser/id\n");
    const readFileSync = fs.readFileSync;
    let injected = false;
    const read = t.mock.method(
      fs,
      "readFileSync",
      (...args: Parameters<typeof fs.readFileSync>) => {
        if (!injected && args[0] === portFile) {
          injected = true;
          return prefix;
        }
        return readFileSync(...args);
      },
    );
    syncBuiltinESMExports();
    t.after(() => {
      read.mock.restore();
      syncBuiltinESMExports();
    });

    const port = await waitForDevToolsPort(
      portFile,
      () => false,
      Date.now() + 5_000,
    );
    assert.equal(injected, true);
    assert.equal(port, "4242");
  });
}
