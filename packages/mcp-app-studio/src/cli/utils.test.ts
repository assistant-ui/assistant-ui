import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isValidPackageName,
  toValidPackageName,
  isEmpty,
  emptyDir,
  updatePackageJson,
  detectPackageManager,
  isValidProjectPath,
} from "./utils";

describe("isValidProjectPath", () => {
  it("accepts valid project names", () => {
    expect(isValidProjectPath("my-app")).toEqual({ valid: true });
    expect(isValidProjectPath("my-mcp-app")).toEqual({ valid: true });
    expect(isValidProjectPath("app123")).toEqual({ valid: true });
  });

  it("rejects empty names", () => {
    const result = isValidProjectPath("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Project name is required");
  });

  it("rejects whitespace-only names", () => {
    const result = isValidProjectPath("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Project name is required");
  });

  it("rejects absolute paths", () => {
    const result = isValidProjectPath("/absolute/path");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Absolute paths");
  });

  it("rejects path traversal attempts", () => {
    const result1 = isValidProjectPath("../escape");
    expect(result1.valid).toBe(false);
    expect(result1.error).toContain("Path traversal");

    const result2 = isValidProjectPath("foo/../bar");
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain("Path traversal");
  });

  it("accepts nested relative paths within cwd", () => {
    expect(isValidProjectPath("apps/my-app")).toEqual({ valid: true });
  });
});

describe("isValidPackageName", () => {
  it("accepts valid package names", () => {
    expect(isValidPackageName("my-app")).toBe(true);
    expect(isValidPackageName("my-chatgpt-app")).toBe(true);
    expect(isValidPackageName("app123")).toBe(true);
    expect(isValidPackageName("a")).toBe(true);
  });

  it("accepts scoped package names", () => {
    expect(isValidPackageName("@scope/my-app")).toBe(true);
    expect(isValidPackageName("@assistant-ui/mcp-app-studio")).toBe(true);
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

describe("emptyDir", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "emptydir-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("removes all files except .git", () => {
    fs.writeFileSync(path.join(tempDir, "file.txt"), "content");
    fs.mkdirSync(path.join(tempDir, ".git"));
    fs.writeFileSync(path.join(tempDir, ".git", "config"), "config");

    emptyDir(tempDir);

    expect(fs.existsSync(path.join(tempDir, "file.txt"))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, ".git"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, ".git", "config"))).toBe(true);
  });

  it("removes subdirectories", () => {
    fs.mkdirSync(path.join(tempDir, "subdir"));
    fs.writeFileSync(path.join(tempDir, "subdir", "nested.txt"), "content");

    emptyDir(tempDir);

    expect(fs.existsSync(path.join(tempDir, "subdir"))).toBe(false);
  });

  it("handles non-existent directory gracefully", () => {
    const nonExistentPath = path.join(os.tmpdir(), "non-existent-dir-12345");
    expect(() => emptyDir(nonExistentPath)).not.toThrow();
  });

  it("removes hidden files except .git", () => {
    fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
    fs.writeFileSync(path.join(tempDir, ".gitignore"), "node_modules");

    emptyDir(tempDir);

    expect(fs.existsSync(path.join(tempDir, ".env"))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, ".gitignore"))).toBe(false);
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

  it("updates description when provided", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "template" }),
    );
    updatePackageJson(tempDir, "my-app", "My app description");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(tempDir, "package.json"), "utf-8"),
    );
    expect(pkg.description).toBe("My app description");
  });

  it("does not add description when not provided", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "template" }),
    );
    updatePackageJson(tempDir, "my-app");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(tempDir, "package.json"), "utf-8"),
    );
    expect(pkg.description).toBeUndefined();
  });

  it("pins mcp-app-studio dependency to the CLI version when provided", () => {
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({
        name: "template",
        dependencies: { "mcp-app-studio": "^0.1.0" },
      }),
    );
    updatePackageJson(tempDir, "my-app", undefined, {
      mcpAppStudioVersion: "0.5.0",
    });
    const pkg = JSON.parse(
      fs.readFileSync(path.join(tempDir, "package.json"), "utf-8"),
    );
    expect(pkg.dependencies["mcp-app-studio"]).toBe("^0.5.0");
  });
});

describe("detectPackageManager", () => {
  const originalEnv = process.env["npm_config_user_agent"];

  afterEach(() => {
    process.env["npm_config_user_agent"] = originalEnv;
  });

  it("detects pnpm", () => {
    process.env["npm_config_user_agent"] = "pnpm/8.0.0 node/v18.0.0";
    expect(detectPackageManager()).toBe("pnpm");
  });

  it("detects yarn", () => {
    process.env["npm_config_user_agent"] = "yarn/1.22.0 node/v18.0.0";
    expect(detectPackageManager()).toBe("yarn");
  });

  it("detects bun", () => {
    process.env["npm_config_user_agent"] = "bun/1.0.0";
    expect(detectPackageManager()).toBe("bun");
  });

  it("defaults to npm", () => {
    process.env["npm_config_user_agent"] = "";
    expect(detectPackageManager()).toBe("npm");
  });

  it("defaults to npm when env var is missing", () => {
    delete process.env["npm_config_user_agent"];
    expect(detectPackageManager()).toBe("npm");
  });
});
