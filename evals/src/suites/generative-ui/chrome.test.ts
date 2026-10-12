import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openChromePage } from "./chrome.ts";

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
