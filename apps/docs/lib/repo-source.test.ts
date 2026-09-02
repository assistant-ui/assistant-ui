import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadRepoSourceSnapshot, repoSourceRoot } from "./repo-source";

const reads = vi.hoisted(() => ({ inFlight: 0, peak: 0 }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      reads.inFlight += 1;
      reads.peak = Math.max(reads.peak, reads.inFlight);
      try {
        return await actual.readFile(...args);
      } finally {
        reads.inFlight -= 1;
      }
    },
  };
});

const roots: string[] = [];

async function createSourceTree(files: Record<string, string>) {
  const root = await mkdtemp(path.join(tmpdir(), "repo-source-"));
  roots.push(root);

  for (const [filePath, contents] of Object.entries(files)) {
    const target = path.join(root, filePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }

  return root;
}

beforeEach(() => {
  reads.inFlight = 0;
  reads.peak = 0;
});

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe("repoSourceRoot", () => {
  it("resolves a dotted generated tree that source globs skip", () => {
    expect(repoSourceRoot()).toBe(
      path.join(process.cwd(), "generated", ".repo-source"),
    );
  });
});

describe("loadRepoSourceSnapshot", () => {
  it("keys nested files by their posix path relative to the root", async () => {
    const root = await createSourceTree({
      "AGENTS.md": "# assistant-ui\n",
      "packages/core/src/index.ts": "export const a = 1;\n",
    });

    await expect(loadRepoSourceSnapshot(root)).resolves.toEqual({
      "AGENTS.md": "# assistant-ui\n",
      "packages/core/src/index.ts": "export const a = 1;\n",
    });
  });

  it("reads contents as utf-8", async () => {
    const root = await createSourceTree({ "emoji.md": "🙂 ok\n" });

    await expect(loadRepoSourceSnapshot(root)).resolves.toEqual({
      "emoji.md": "🙂 ok\n",
    });
  });

  it("bounds concurrent reads so a large tree cannot exhaust file descriptors", async () => {
    const files = Object.fromEntries(
      Array.from({ length: 400 }, (_, index) => [
        `packages/p${index % 20}/file-${index}.ts`,
        `export const n = ${index};\n`,
      ]),
    );
    const root = await createSourceTree(files);

    const snapshot = await loadRepoSourceSnapshot(root);

    expect(Object.keys(snapshot)).toHaveLength(400);
    expect(reads.peak).toBeLessThanOrEqual(32);
  });

  it("rejects when the tree is missing", async () => {
    await expect(
      loadRepoSourceSnapshot(path.join(tmpdir(), "repo-source-absent")),
    ).rejects.toThrow(/ENOENT/);
  });
});
