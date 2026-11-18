import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

const script = path.join(import.meta.dirname, "capture-cloud-screenshots.mts");

it("exits with the spawn error and removes its profile when Chrome cannot be launched", ({
  onTestFinished,
}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-docs-spawn-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const chrome = path.join(dir, "chrome");
  writeFileSync(chrome, "#!/bin/sh\nexit 0\n", { mode: 0o644 });
  // The script starts capturing when it loads, so it runs in its own process as `pnpm capture:cloud-screenshots` does.
  const run = spawnSync(process.execPath, [script, "settings-api-keys"], {
    encoding: "utf8",
    env: { ...process.env, AUI_DOCS_CHROME: chrome, TMPDIR: dir },
  });
  expect({
    status: run.status,
    error: run.stderr.trim().split("\n").at(-1),
    profiles: readdirSync(dir).filter((name) =>
      name.startsWith("aui-docs-chrome-"),
    ),
  }).toEqual({ status: 1, error: `spawn ${chrome} EACCES`, profiles: [] });
});
