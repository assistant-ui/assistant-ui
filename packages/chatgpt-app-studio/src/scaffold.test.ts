import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { copyDir, renameFiles, updatePackageJson } from "./utils.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("scaffold integration", () => {
  let tempDir: string;
  const templateDir = path.resolve(__dirname, "../templates/starter");

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("scaffolds a complete project", () => {
    const projectDir = path.join(tempDir, "my-app");

    copyDir(templateDir, projectDir);
    renameFiles(projectDir);
    updatePackageJson(projectDir, "my-app");

    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".env.local"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "_gitignore"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, "_env.local"))).toBe(false);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("my-app");
    expect(pkg.version).toBe("0.1.0");
    expect(pkg.private).toBe(true);
  });

  it("includes required directories", () => {
    const projectDir = path.join(tempDir, "test-project");
    copyDir(templateDir, projectDir);

    expect(fs.existsSync(path.join(projectDir, "app"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "components"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "lib"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "scripts"))).toBe(true);
  });

  it("includes example widget", () => {
    const projectDir = path.join(tempDir, "test-project");
    copyDir(templateDir, projectDir);

    expect(
      fs.existsSync(path.join(projectDir, "components/examples/poi-map")),
    ).toBe(true);
  });

  it("includes export script", () => {
    const projectDir = path.join(tempDir, "test-project");
    copyDir(templateDir, projectDir);

    expect(fs.existsSync(path.join(projectDir, "scripts/export.ts"))).toBe(
      true,
    );

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.scripts.export).toBe("tsx scripts/export.ts");
  });

  it("includes workbench", () => {
    const projectDir = path.join(tempDir, "test-project");
    copyDir(templateDir, projectDir);

    expect(fs.existsSync(path.join(projectDir, "lib/workbench"))).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "lib/workbench/openai-context.tsx")),
    ).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "lib/workbench/store.ts"))).toBe(
      true,
    );
  });
});
