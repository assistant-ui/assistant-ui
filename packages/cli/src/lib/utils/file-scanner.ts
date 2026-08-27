import * as fs from "node:fs";
import * as path from "node:path";
import { sync as globSync } from "glob";

export interface ScanOptions {
  cwd?: string;
  pattern?: string;
  ignore?: string[];
}

export function* readProjectFiles(
  pattern: string,
  options: { cwd: string; ignore?: string[] },
): Generator<{ file: string; fullPath: string; content: string }> {
  const files = globSync(pattern, options);

  for (const file of files) {
    const fullPath = path.join(options.cwd, file);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      yield { file, fullPath, content };
    } catch {
      continue;
    }
  }
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

  const patterns = Array.isArray(importPattern)
    ? importPattern
    : [importPattern];

  for (const { content } of readProjectFiles(pattern, { cwd, ignore })) {
    if (patterns.some((p) => content.includes(p))) {
      return true;
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

  const result: string[] = [];

  for (const { fullPath, content } of readProjectFiles(pattern, {
    cwd,
    ignore,
  })) {
    if (content.includes(searchString)) {
      result.push(fullPath);
    }
  }

  return result;
}
