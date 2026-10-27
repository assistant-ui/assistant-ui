import assert from "node:assert/strict";
import fs, { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { findChrome, openChromePage } from "./chrome.ts";

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
  test(
    `waits for Chrome's port record after ${prefix ? "an incomplete" : "an empty"} read`,
    { skip: findChrome() ? false : "no Chrome to render in" },
    async (t) => {
      const readFileSync = fs.readFileSync;
      let injected = false;
      const read = t.mock.method(
        fs,
        "readFileSync",
        (...args: Parameters<typeof fs.readFileSync>) => {
          if (
            !injected &&
            typeof args[0] === "string" &&
            basename(args[0]) === "DevToolsActivePort"
          ) {
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

      const page = await openChromePage("about:blank", 680);
      try {
        assert.equal(injected, true);
        assert.equal(await page.evaluate("1 + 1", 5_000), 2);
      } finally {
        await page.close();
      }
    },
  );
}
