import { randomUUID } from "node:crypto";
import { readFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import {
  createLocalStorageAdapter,
  type AsyncStorageLike,
  type TitleGenerationAdapter,
} from "@assistant-ui/core/react";

export type { AsyncStorageLike } from "@assistant-ui/core/react";

export type FileStorageOptions = {
  dir: string;
};

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
  private ready: Promise<void> | undefined;

  public constructor(options: FileStorageOptions) {
    this.dir = options.dir;
  }

  private getFilePath(key: string) {
    return join(this.dir, `${encodeURIComponent(key)}.json`);
  }

  private ensureDir(): Promise<void> {
    if (!this.ready) {
      this.ready = mkdir(this.dir, { recursive: true }).then(() => undefined);
    }
    return this.ready;
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

export const createFileStorageAdapter = (
  options: CreateFileStorageAdapterOptions,
): RemoteThreadListAdapter => {
  const { dir, prefix, titleGenerator } = options;

  return createLocalStorageAdapter({
    storage: new FileStorage({ dir }),
    prefix,
    titleGenerator,
  });
};
