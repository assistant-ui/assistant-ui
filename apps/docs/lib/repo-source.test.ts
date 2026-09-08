import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRepoSourceReader,
  repoSourceRoot,
  snapshotSourceReader,
} from "./repo-source";

const reads = vi.hoisted(() => ({
  inFlight: 0,
  peak: 0,
  paths: [] as string[],
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      reads.inFlight += 1;
      reads.peak = Math.max(reads.peak, reads.inFlight);
      reads.paths.push(String(args[0]));
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
  reads.paths = [];
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

describe("createRepoSourceReader", () => {
  it("reads one named file as utf-8 without touching the rest of the tree", async () => {
    const root = await createSourceTree({
      "AGENTS.md": "🙂 assistant-ui\n",
      "packages/core/src/index.ts": "export const a = 1;\n",
    });

    await expect(
      createRepoSourceReader(root).readFile("AGENTS.md"),
    ).resolves.toBe("🙂 assistant-ui\n");
    expect(reads.paths).toEqual([path.join(root, "AGENTS.md")]);
  });

  it("resolves a missing file to undefined so callers keep their own error", async () => {
    const root = await createSourceTree({ "AGENTS.md": "# assistant-ui\n" });

    await expect(
      createRepoSourceReader(root).readFile("packages/core/package.json"),
    ).resolves.toBeUndefined();
  });

  it("rejects a path that climbs out of the tree", async () => {
    const root = await createSourceTree({ "AGENTS.md": "# assistant-ui\n" });

    await expect(
      createRepoSourceReader(root).readFile("../../etc/passwd"),
    ).rejects.toThrow(/Unsafe repo source path/);
  });

  it("keys a prefix read by its path relative to that prefix", async () => {
    const root = await createSourceTree({
      "AGENTS.md": "# assistant-ui\n",
      "packages/core/src/index.ts": "export const a = 1;\n",
      "packages/core/package.json": "{}\n",
      "packages/core-other/secret.ts": "not part of the package\n",
    });

    await expect(
      createRepoSourceReader(root).readUnder("packages/core"),
    ).resolves.toEqual({
      "package.json": "{}\n",
      "src/index.ts": "export const a = 1;\n",
    });
  });

  it("resolves a missing prefix to an empty map", async () => {
    const root = await createSourceTree({ "AGENTS.md": "# assistant-ui\n" });

    await expect(
      createRepoSourceReader(root).readUnder("packages/absent"),
    ).resolves.toEqual({});
    await expect(
      createRepoSourceReader(
        path.join(tmpdir(), "repo-source-absent"),
      ).readUnder("packages"),
    ).resolves.toEqual({});
  });

  it("bounds concurrent reads so a large subtree cannot exhaust file descriptors", async () => {
    const files = Object.fromEntries(
      Array.from({ length: 400 }, (_, index) => [
        `packages/p${index % 20}/file-${index}.ts`,
        `export const n = ${index};\n`,
      ]),
    );
    const root = await createSourceTree(files);

    const read = await createRepoSourceReader(root).readUnder("packages");

    expect(Object.keys(read)).toHaveLength(400);
    expect(reads.peak).toBeLessThanOrEqual(32);
  });
});

describe("snapshotSourceReader", () => {
  it("serves named entries and prefix reads from a literal map", async () => {
    const reader = snapshotSourceReader({
      "AGENTS.md": "# assistant-ui\n",
      "packages/core/src/index.ts": "export const a = 1;\n",
      "packages/core-other/secret.ts": "not part of the package\n",
    });

    await expect(reader.readFile("AGENTS.md")).resolves.toBe(
      "# assistant-ui\n",
    );
    await expect(
      reader.readFile("packages/absent.ts"),
    ).resolves.toBeUndefined();
    await expect(reader.readUnder("packages/core")).resolves.toEqual({
      "src/index.ts": "export const a = 1;\n",
    });
  });
});
