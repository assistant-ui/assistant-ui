import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFileStorageAdapter, FileStorage } from "./FileStorage";

const tempDirs: string[] = [];

const createTempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), "react-ink-file-storage-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map(async (dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("FileStorage", () => {
  it("returns null for missing keys", async () => {
    const dir = await createTempDir();
    const storage = new FileStorage({ dir });

    await expect(storage.getItem("missing")).resolves.toBeNull();
  });

  it("writes, reads, and overwrites values", async () => {
    const dir = await createTempDir();
    const storage = new FileStorage({ dir });

    await storage.setItem("@assistant-ui:threads", '{"count":1}');
    await expect(storage.getItem("@assistant-ui:threads")).resolves.toBe(
      '{"count":1}',
    );

    await storage.setItem("@assistant-ui:threads", '{"count":2}');
    await expect(storage.getItem("@assistant-ui:threads")).resolves.toBe(
      '{"count":2}',
    );

    const files = await readdir(dir);
    expect(files).toEqual(["%40assistant-ui%3Athreads.json"]);
  });

  it("removes existing keys and ignores missing ones", async () => {
    const dir = await createTempDir();
    const storage = new FileStorage({ dir });

    await storage.setItem("thread-1", "hello");
    await storage.removeItem("thread-1");
    await storage.removeItem("thread-1");

    await expect(storage.getItem("thread-1")).resolves.toBeNull();
  });

  it("uses unique temp files for concurrent writes", async () => {
    const dir = await createTempDir();
    const storage = new FileStorage({ dir });

    await Promise.all([
      storage.setItem("thread-1", "first"),
      storage.setItem("thread-1", "second"),
    ]);

    const finalValue = await storage.getItem("thread-1");
    expect(["first", "second"]).toContain(finalValue);

    const files = await readdir(dir);
    expect(files).toEqual(["thread-1.json"]);
  });
});

describe("createFileStorageAdapter", () => {
  it("persists thread metadata via the local storage adapter", async () => {
    const dir = await createTempDir();
    const adapter = createFileStorageAdapter({
      dir,
      prefix: "@assistant-ui:test:",
    });

    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    await expect(adapter.initialize("thread-1")).resolves.toEqual({
      externalId: undefined,
      remoteId: "thread-1",
    });

    await expect(adapter.fetch("thread-1")).resolves.toEqual({
      externalId: undefined,
      remoteId: "thread-1",
      status: "regular",
      title: undefined,
    });

    const threadsFile = join(dir, "%40assistant-ui%3Atest%3Athreads.json");
    await expect(readFile(threadsFile, "utf8")).resolves.toContain("thread-1");
  });
});
