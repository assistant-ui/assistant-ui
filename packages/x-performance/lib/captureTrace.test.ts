// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { captureTrace } from "./trace.mjs";

const mocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  spawn: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    readFileSync: (...args: Parameters<typeof original.readFileSync>) =>
      mocks.readFileSync(...args) ?? original.readFileSync(...args),
    existsSync: (...args: Parameters<typeof original.existsSync>) =>
      mocks.existsSync(...args) ?? original.existsSync(...args),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return {
    ...original,
    spawn: (...args: Parameters<typeof original.spawn>) =>
      mocks.spawn(...args) ?? original.spawn(...args),
  };
});

vi.mock("node:timers/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:timers/promises")>()),
  setTimeout: (delay: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, delay)),
}));

const dirs: string[] = [];
const hasChrome = [
  process.env["AUI_PERF_CHROME"],
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].some((path) => path && existsSync(path));

afterEach(() => {
  mocks.readFileSync.mockReset();
  mocks.existsSync.mockReset();
  mocks.spawn.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

it.each(["", "42"])(
  "captures a real browser trace after an incomplete port read %j",
  { skip: !hasChrome },
  async (prefix) => {
    const dir = mkdtempSync(join(tmpdir(), "aui-trace-port-"));
    dirs.push(dir);
    const target = join(dir, "fixture.html");
    writeFileSync(
      target,
      "<!doctype html><title>trace fixture</title><p>Ready</p>",
    );
    let injected = false;
    mocks.readFileSync.mockImplementation((path: unknown) => {
      if (
        !injected &&
        typeof path === "string" &&
        basename(path) === "DevToolsActivePort"
      ) {
        injected = true;
        return prefix;
      }
      return undefined;
    });

    const events = await captureTrace(target, 0.05, 100);
    expect(injected).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({ name: "aui-perf-target" }),
    );
  },
);

it("waits for Chrome to close before removing its profile after a failed connection", async () => {
  vi.useFakeTimers();
  const child = new ChildProcess();
  vi.spyOn(child, "kill").mockReturnValue(true);
  let profile = "";
  mocks.existsSync.mockImplementation((path: unknown) =>
    path === "/usr/bin/google-chrome" ? true : undefined,
  );
  mocks.spawn.mockImplementation((_command: string, args: string[]) => {
    profile = args
      .find((arg) => arg.startsWith("--user-data-dir="))!
      .slice("--user-data-dir=".length);
    dirs.push(profile);
    writeFileSync(
      join(profile, "DevToolsActivePort"),
      "12345\n/devtools/browser/test\n",
    );
    return child;
  });
  const failure = new Error("DevTools connection failed");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
  const result = captureTrace("unused.html", 0).catch(
    (error: unknown) => error,
  );

  try {
    await vi.advanceTimersByTimeAsync(1000);
    expect(existsSync(profile)).toBe(true);
  } finally {
    child.emit("close", 0, null);
    await result;
  }
  await expect(result).resolves.toBe(failure);
  expect(existsSync(profile)).toBe(false);
});
