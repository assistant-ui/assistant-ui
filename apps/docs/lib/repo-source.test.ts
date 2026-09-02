import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRepoSourceSnapshot, repoSourceRoot } from "./repo-source";

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

  it("rejects when the tree is missing", async () => {
    await expect(
      loadRepoSourceSnapshot(path.join(tmpdir(), "repo-source-absent")),
    ).rejects.toThrow(/ENOENT/);
  });
});
