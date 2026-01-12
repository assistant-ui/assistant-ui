import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "node:url";
import { copyDir, renameFiles, updatePackageJson } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("smoke test", () => {
  let projectDir: string;
  const templateDir = path.resolve(__dirname, "../templates/starter");

  beforeAll(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-test-"));

    copyDir(templateDir, projectDir);
    renameFiles(projectDir);
    updatePackageJson(projectDir, "smoke-test-app");
  });

  afterAll(() => {
    if (projectDir && fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("scaffolded project installs dependencies", () => {
    execSync("pnpm install", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 60_000,
    });

    expect(fs.existsSync(path.join(projectDir, "node_modules"))).toBe(true);
  }, 90_000);

  it("scaffolded project builds", () => {
    execSync("pnpm build", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 60_000,
    });

    expect(fs.existsSync(path.join(projectDir, ".next"))).toBe(true);
  }, 90_000);

  it("scaffolded project exports widget", () => {
    execSync("pnpm export", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 30_000,
    });

    const exportDir = path.join(projectDir, "export");
    expect(fs.existsSync(exportDir)).toBe(true);
    expect(fs.existsSync(path.join(exportDir, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, "widget", "widget.js"))).toBe(
      true,
    );
  }, 60_000);
});
