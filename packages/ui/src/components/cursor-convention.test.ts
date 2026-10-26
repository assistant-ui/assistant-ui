// @vitest-environment node
/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// The kit follows the shadcn/ui convention: controls keep the platform's
// default cursor, links keep the browser's pointer, and apps that want a
// pointer on every button opt in with one base-layer rule.
const here = dirname(fileURLToPath(import.meta.url));
const roots = ["react", "vue"].map((dir) => join(here, dir));

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts|vue)$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [path]
      : [];
  });

it("leaves the pointer cursor to the consuming app", () => {
  const offenders = roots
    .flatMap(sourceFiles)
    .filter((file) => /\bcursor-pointer\b/.test(readFileSync(file, "utf8")))
    .map((file) => relative(here, file));

  expect(offenders).toEqual([]);
});
