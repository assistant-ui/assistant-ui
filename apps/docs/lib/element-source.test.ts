import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readElementSource } from "./element-source";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: vi.fn(),
}));

let root: string;
let canonical: string;
let fallback: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "aui-element-source-"));
  const app = path.join(root, "apps/docs");
  canonical = path.join(
    root,
    "packages/ui/src/components/react/assistant-ui/elements",
  );
  fallback = path.join(app, "components/demo/elements");
  await Promise.all([
    mkdir(canonical, { recursive: true }),
    mkdir(fallback, { recursive: true }),
  ]);
  vi.spyOn(process, "cwd").mockReturnValue(app);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true });
});

it("prefers canonical source and preserves leading whitespace and Unicode", async () => {
  await writeFile(
    path.join(canonical, "thread.tsx"),
    "  const title = '🙂';\n",
  );
  await writeFile(path.join(fallback, "thread.tsx"), "local demo\n");
  await expect(readElementSource("thread.tsx")).resolves.toBe(
    "  const title = '🙂';",
  );
});

it("falls back to app-owned demos when canonical source is absent", async () => {
  await mkdir(path.join(fallback, "nested"));
  await writeFile(path.join(fallback, "nested/demo.tsx"), "demo source\n\n");
  await expect(readElementSource("nested/demo.tsx")).resolves.toBe(
    "demo source",
  );
});

it("reports the requested file and retains the fallback read failure", async () => {
  await expect(readElementSource("missing.tsx")).rejects.toMatchObject({
    message: "Element source not found: missing.tsx",
    cause: { code: "ENOENT", path: path.join(fallback, "missing.tsx") },
  });
});
