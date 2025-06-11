import { normalize, relative } from "path";
import path from "path";

export function sanitizePath(userPath: string): string {
  if (!userPath || typeof userPath !== "string") {
    throw new Error("Invalid path: Path must be a non-empty string");
  }

  const normalized = normalize(userPath);

  if (path.isAbsolute(normalized)) {
    throw new Error("Invalid path: Absolute paths are not allowed");
  }

  const relativePath = relative("", normalized);

  if (relativePath.startsWith("..")) {
    throw new Error("Invalid path: Directory traversal attempt detected");
  }

  if (relativePath.includes("..")) {
    throw new Error("Invalid path: Path contains invalid traversal sequences");
  }

  if (relativePath.includes("\0")) {
    throw new Error("Invalid path: Path contains null bytes");
  }

  if (process.platform !== "win32") {
    if (normalized.includes("\\")) {
      throw new Error("Invalid path: Backslashes not allowed");
    }
  } else {
    if (normalized.includes(":") || normalized.startsWith("\\\\")) {
      throw new Error("Invalid path: Path contains invalid Windows characters");
    }
  }

  const segments = relativePath.split(path.sep);
  for (const segment of segments) {
    if (segment.startsWith(".") && segment !== ".") {
      throw new Error("Invalid path: Hidden files are not allowed");
    }
  }

  return relativePath;
}

export function isValidPathCharacters(path: string): boolean {
  const validPathRegex = /^[a-zA-Z0-9\-_\/\.]+$/;
  return validPathRegex.test(path);
}
