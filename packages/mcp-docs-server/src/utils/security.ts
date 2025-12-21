import path from "node:path";

export function sanitizePath(userPath: string): string {
  if (!userPath || typeof userPath !== "string") {
    throw new Error("Invalid path: Path must be a non-empty string");
  }

  // Check for traversal patterns before normalization - defense in depth
  if (userPath.includes("../") || userPath.includes("..\\")) {
    throw new Error("Invalid path: Directory traversal attempt detected");
  }

  const normalized = path.normalize(userPath);

  if (path.isAbsolute(normalized)) {
    throw new Error("Invalid path: Absolute paths are not allowed");
  }

  const relativePath = path.relative("", normalized);

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

  // Always return Unix-style paths for consistency across platforms
  return relativePath.replace(/\\/g, "/");
}
