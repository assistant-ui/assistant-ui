import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import {
  createLocalStorageAdapter,
  type AsyncStorageLike,
  type TitleGenerationAdapter,
} from "@assistant-ui/core/react";

export type CreateFileStorageAdapterOptions = {
  dir: string;
  prefix?: string | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
};

const isEnoent = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: unknown }).code === "ENOENT";

export class FileStorage implements AsyncStorageLike {
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private getFilePath(key: string) {
    return join(this.dir, `${encodeURIComponent(key)}.json`);
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await readFile(this.getFilePath(key), "utf8");
    } catch (error) {
      if (isEnoent(error)) return null;
      throw error;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.ensureDir();

    const targetPath = this.getFilePath(key);
    const tempPath = `${targetPath}.${randomUUID()}.tmp`;

    try {
      await writeFile(tempPath, value, "utf8");
      await rename(tempPath, targetPath);
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    await rm(this.getFilePath(key), { force: true });
  }
}

const fileStorages = new Map<string, WeakRef<FileStorage>>();
const fileStorageRegistry = new FinalizationRegistry<string>(
  (normalizedDir) => {
    if (!fileStorages.get(normalizedDir)?.deref()) {
      fileStorages.delete(normalizedDir);
    }
  },
);

const normalizeStorageDir = (dir: string): string => {
  const resolvedDir = resolve(dir);
  const missingSegments: string[] = [];
  let currentDir = resolvedDir;

  for (;;) {
    try {
      return join(realpathSync.native(currentDir), ...missingSegments);
    } catch {
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) return resolvedDir;

      missingSegments.unshift(basename(currentDir));
      currentDir = parentDir;
    }
  }
};

const getFileStorage = (dir: string): FileStorage => {
  const normalizedDir = normalizeStorageDir(dir);
  const cached = fileStorages.get(normalizedDir)?.deref();
  if (cached) return cached;

  const storage = new FileStorage(normalizedDir);
  fileStorages.set(normalizedDir, new WeakRef(storage));
  fileStorageRegistry.register(storage, normalizedDir);
  return storage;
};

export const createFileStorageAdapter = (
  options: CreateFileStorageAdapterOptions,
): RemoteThreadListAdapter => {
  const { dir, prefix, titleGenerator } = options;

  return createLocalStorageAdapter({
    storage: getFileStorage(dir),
    prefix,
    titleGenerator,
  });
};
