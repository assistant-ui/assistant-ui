import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGES_DIR = path.resolve(__dirname, "../../../packages");

/**
 * traction.ts pulls in a `server-only` module, so the list is read from source
 * rather than imported.
 */
const listedPackages = (): { name: string; deprecated: boolean }[] => {
  const source = readFileSync(path.join(__dirname, "traction.ts"), "utf8");
  const start = source.indexOf("export const PACKAGES");
  const block = source.slice(start, source.indexOf("\n];", start));
  return block
    .split(/\n  \{/)
    .slice(1)
    .flatMap((entry) => {
      const name = /name:\s*"([^"]+)"/.exec(entry)?.[1];
      return name
        ? [{ name, deprecated: entry.includes("deprecated: true") }]
        : [];
    });
};

/** Published names in the monorepo. Private workspaces never reach npm. */
const publishedPackages = (): string[] =>
  readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const manifest = path.join(PACKAGES_DIR, entry.name, "package.json");
      let raw: string;
      try {
        raw = readFileSync(manifest, "utf8");
      } catch {
        return [];
      }
      const pkg = JSON.parse(raw) as { name?: string; private?: boolean };
      return pkg.private || !pkg.name ? [] : [pkg.name];
    })
    .sort();

describe("the packages directory covers what we publish", () => {
  it("reads both sides", () => {
    expect(listedPackages().length).toBeGreaterThan(20);
    expect(publishedPackages().length).toBeGreaterThan(20);
  });

  it("lists every published package in the monorepo", () => {
    const listed = new Set(listedPackages().map((pkg) => pkg.name));
    expect(publishedPackages().filter((name) => !listed.has(name))).toEqual([]);
  });

  it("only lists packages that still exist, unless they are deprecated", () => {
    const published = new Set(publishedPackages());
    const stale = listedPackages()
      .filter((pkg) => !pkg.deprecated && !published.has(pkg.name))
      .map((pkg) => pkg.name);
    expect(stale).toEqual([]);
  });
});
