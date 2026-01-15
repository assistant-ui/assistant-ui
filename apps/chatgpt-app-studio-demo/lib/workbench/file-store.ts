interface StoredFile {
  file: File;
  objectUrl: string;
}

const fileStore = new Map<string, StoredFile>();

export function storeFile(file: File): string {
  const fileId = crypto.randomUUID();
  const objectUrl = URL.createObjectURL(file);
  fileStore.set(fileId, { file, objectUrl });
  return fileId;
}

export function getFileUrl(fileId: string): string | null {
  return fileStore.get(fileId)?.objectUrl ?? null;
}

export function clearFiles(): void {
  for (const { objectUrl } of fileStore.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  fileStore.clear();
}

export function getFileCount(): number {
  return fileStore.size;
}
