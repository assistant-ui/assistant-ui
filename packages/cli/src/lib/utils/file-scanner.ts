import * as fs from "node:fs";
import * as path from "node:path";
import { sync as globSync } from "glob";

export interface ScanOptions {
  cwd?: string;
  pattern?: string;
  ignore?: string[];
}

export function scanForImport(
  importPattern: string | string[],
  options: ScanOptions = {},
): boolean {
  const cwd = options.cwd || process.cwd();
  const pattern = options.pattern || "**/*.{js,jsx,ts,tsx}";
  const ignore = options.ignore || [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
  ];

  const files = globSync(pattern, { cwd, ignore });
  const patterns = Array.isArray(importPattern)
    ? importPattern
    : [importPattern];

  for (const file of files) {
    const fullPath = path.join(cwd, file);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      if (patterns.some((p) => content.includes(p))) {
        return true;
      }
    } catch {
      // Ignore files that cannot be read
    }
  }

  return false;
}

export function getFilesContaining(
  searchString: string,
  options: ScanOptions = {},
): string[] {
  const cwd = options.cwd || process.cwd();
  const pattern = options.pattern || "**/*.{js,jsx,ts,tsx}";
  const ignore = options.ignore || [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
  ];

  const files = globSync(pattern, { cwd, ignore });
  const result: string[] = [];

  for (const file of files) {
    const fullPath = path.join(cwd, file);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes(searchString)) {
        result.push(fullPath);
      }
    } catch {
      // Ignore files that cannot be read
    }
  }

  return result;
}
