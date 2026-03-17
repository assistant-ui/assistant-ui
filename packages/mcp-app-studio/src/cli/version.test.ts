import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getVersionFromCliDir } from "./version";

describe("getVersionFromCliDir", () => {
  it("reads version when invoked from src/cli", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-version-src-"));
    const cliDir = path.join(root, "src", "cli");
    fs.mkdirSync(cliDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ version: "1.2.3" }),
    );

    expect(getVersionFromCliDir(cliDir)).toBe("1.2.3");
  });

  it("reads version when invoked from dist/cli", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-version-dist-"));
    const cliDir = path.join(root, "dist", "cli");
    fs.mkdirSync(cliDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ version: "4.5.6" }),
    );

    expect(getVersionFromCliDir(cliDir)).toBe("4.5.6");
  });
});
