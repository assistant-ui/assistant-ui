import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "aui-docs-lite-"));
  vi.spyOn(process, "cwd").mockReturnValue(root);
  vi.resetModules();
  await mkdir(join(root, ".source"));
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await rm(root, { recursive: true });
});

const recorded = async () =>
  JSON.parse(await readFile(join(root, ".source/lite-pages.json"), "utf8"));

it("records opened pages but not a burst of bulk loads", async () => {
  vi.useFakeTimers();
  const { pendingPage } = await import("./content-lite");
  pendingPage("docs", "a.mdx");
  vi.advanceTimersByTime(5000);
  pendingPage("docs", "b.mdx");
  pendingPage("docs", "b.mdx");
  expect(await recorded()).toEqual(["docs/a.mdx", "docs/b.mdx"]);

  vi.advanceTimersByTime(5000);
  for (const page of ["c", "d", "e", "f", "g"])
    pendingPage("docs", `${page}.mdx`);
  expect(await recorded()).toEqual([
    "docs/a.mdx",
    "docs/b.mdx",
    "docs/c.mdx",
    "docs/d.mdx",
    "docs/e.mdx",
  ]);
});
