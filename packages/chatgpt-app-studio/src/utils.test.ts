import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isValidPackageName,
  toValidPackageName,
  isEmpty,
  copyDir,
  renameFiles,
  updatePackageJson,
  detectPackageManager,
} from "./utils.js";

describe("isValidPackageName", () => {
  it("accepts valid package names", () => {
    expect(isValidPackageName("my-app")).toBe(true);
    expect(isValidPackageName("my-chatgpt-app")).toBe(true);
    expect(isValidPackageName("app123")).toBe(true);
    expect(isValidPackageName("a")).toBe(true);
  });

  it("accepts scoped package names", () => {
    expect(isValidPackageName("@scope/my-app")).toBe(true);
    expect(isValidPackageName("@assistant-ui/chatgpt-app-studio")).toBe(true);
  });

  it("rejects invalid package names", () => {
    expect(isValidPackageName("My-App")).toBe(false);
    expect(isValidPackageName("my app")).toBe(false);
    expect(isValidPackageName(".hidden")).toBe(false);
    expect(isValidPackageName("_private")).toBe(false);
    expect(isValidPackageName("")).toBe(false);
  });
});

describe("toValidPackageName", () => {
  it("converts to lowercase", () => {
    expect(toValidPackageName("MyApp")).toBe("myapp");
    expect(toValidPackageName("MY-APP")).toBe("my-app");
  });

  it("replaces spaces with hyphens", () => {
    expect(toValidPackageName("my app")).toBe("my-app");
    expect(toValidPackageName("my  app")).toBe("my-app");
  });

  it("removes leading dots and underscores", () => {
    expect(toValidPackageName(".hidden")).toBe("hidden");
    expect(toValidPackageName("_private")).toBe("private");
  });

  it("replaces invalid characters with hyphens", () => {
    expect(toValidPackageName("my@app")).toBe("my-app");
    expect(toValidPackageName("my$app!")).toBe("my-app-");
  });

  it("trims whitespace", () => {
    expect(toValidPackageName("  my-app  ")).toBe("my-app");
  });
});

describe("isEmpty", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns true for non-existent directory", () => {
    expect(isEmpty("/non/existent/path")).toBe(true);
  });

  it("returns true for empty directory", () => {
    expect(isEmpty(tempDir)).toBe(true);
  });

  it("returns true for directory with only .git", () => {
    fs.mkdirSync(path.join(tempDir, ".git"));
    expect(isEmpty(tempDir)).toBe(true);
  });

  it("returns false for non-empty directory", () => {
    fs.writeFileSync(path.join(tempDir, "file.txt"), "content");
    expect(isEmpty(tempDir)).toBe(false);
  });
});

describe("copyDir", () => {
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "src-"));
    destDir = path.join(os.tmpdir(), `dest-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
  });

  it("copies files", () => {
    fs.writeFileSync(path.join(srcDir, "file.txt"), "content");
    copyDir(srcDir, destDir);
    expect(fs.readFileSync(path.join(destDir, "file.txt"), "utf-8")).toBe(
      "content",
    );
  });

  it("copies nested directories", () => {
    fs.mkdirSync(path.join(srcDir, "nested"));
    fs.writeFileSync(path.join(srcDir, "nested", "file.txt"), "nested content");
    copyDir(srcDir, destDir);
    expect(
      fs.readFileSync(path.join(destDir, "nested", "file.txt"), "utf-8"),
    ).toBe("nested content");
  });
});

describe("renameFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rename-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("renames _gitignore to .gitignore", () => {
    fs.writeFileSync(path.join(tempDir, "_gitignore"), "node_modules");
    renameFiles(tempDir);
    expect(fs.existsSync(path.join(tempDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "_gitignore"))).toBe(false);
  });

  it("renames _env.local to .env.local", () => {
    fs.writeFileSync(path.join(tempDir, "_env.local"), "SECRET=123");
    renameFiles(tempDir);
    expect(fs.existsSync(path.join(tempDir, ".env.local"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "_env.local"))).toBe(false);
  });

  it("handles missing files gracefully", () => {
    expect(() => renameFiles(tempDir)).not.toThrow();
  });
});

describe("updatePackageJson", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("updates package name", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "template", version: "1.0.0" }),
    );
    updatePackageJson(tempDir, "my-app");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(tempDir, "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("my-app");
    expect(pkg.version).toBe("0.1.0");
    expect(pkg.private).toBe(true);
  });

  it("handles missing package.json gracefully", () => {
    expect(() => updatePackageJson(tempDir, "my-app")).not.toThrow();
  });

  it("throws on invalid JSON", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "not valid json");
    expect(() => updatePackageJson(tempDir, "my-app")).toThrow(
      "Failed to update package.json",
    );
  });
});

describe("detectPackageManager", () => {
  const originalEnv = process.env.npm_config_user_agent;

  afterEach(() => {
    process.env.npm_config_user_agent = originalEnv;
  });

  it("detects pnpm", () => {
    process.env.npm_config_user_agent = "pnpm/8.0.0 node/v18.0.0";
    expect(detectPackageManager()).toBe("pnpm");
  });

  it("detects yarn", () => {
    process.env.npm_config_user_agent = "yarn/1.22.0 node/v18.0.0";
    expect(detectPackageManager()).toBe("yarn");
  });

  it("detects bun", () => {
    process.env.npm_config_user_agent = "bun/1.0.0";
    expect(detectPackageManager()).toBe("bun");
  });

  it("defaults to npm", () => {
    process.env.npm_config_user_agent = "";
    expect(detectPackageManager()).toBe("npm");
  });

  it("defaults to npm when env var is missing", () => {
    delete process.env.npm_config_user_agent;
    expect(detectPackageManager()).toBe("npm");
  });
});
