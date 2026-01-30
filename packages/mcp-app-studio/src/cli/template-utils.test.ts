import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import {
  assertSafeTarEntryPath,
  filterTemplateTarEntry,
  getGithubArchiveTarballUrl,
} from "./template-utils";

describe("getGithubArchiveTarballUrl", () => {
  it("builds a generic archive URL", () => {
    expect(getGithubArchiveTarballUrl("owner/repo", "main")).toBe(
      "https://github.com/owner/repo/archive/main.tar.gz",
    );
  });
});

describe("assertSafeTarEntryPath", () => {
  const root = path.join(os.tmpdir(), "mcp-app-studio-extract-test");

  it("allows normal relative paths", () => {
    expect(() =>
      assertSafeTarEntryPath(root, "repo-main/package.json"),
    ).not.toThrow();
  });

  it("rejects absolute paths", () => {
    expect(() => assertSafeTarEntryPath(root, "/etc/passwd")).toThrow(
      /absolute path/i,
    );
  });

  it("rejects path traversal", () => {
    expect(() => assertSafeTarEntryPath(root, "../escape")).toThrow(
      /unsafe path/i,
    );
    expect(() => assertSafeTarEntryPath(root, "repo/../../escape")).toThrow(
      /unsafe path/i,
    );
  });
});

describe("filterTemplateTarEntry", () => {
  const root = path.join(os.tmpdir(), "mcp-app-studio-extract-test");

  it("skips link entries", () => {
    expect(filterTemplateTarEntry(root, "repo/file", { type: "Link" })).toBe(
      false,
    );
    expect(
      filterTemplateTarEntry(root, "repo/file", { type: "SymbolicLink" }),
    ).toBe(false);
  });

  it("throws on unsafe entry paths", () => {
    expect(() => filterTemplateTarEntry(root, "../escape", {})).toThrow(
      /unsafe path/i,
    );
  });

  it("allows regular file entries", () => {
    expect(filterTemplateTarEntry(root, "repo/file", {})).toBe(true);
  });
});
