import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testContext } from "./test-setup.js";
import * as fs from "fs/promises";

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof fs>("fs/promises");
  return {
    ...actual,
    lstat: vi.fn(actual.lstat),
  };
});

describe("assistantUIDocs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("should list root directory contents", async () => {
    const result = await testContext.callTool("assistantUIDocs", {
      paths: ["/"],
    });

    expect(result.path).toBe("/");
    expect(result.found).toBe(true);
    expect(result.type).toBe("directory");
    expect(result.directories).toContain("api-reference");
    expect(result.directories).toContain("guides");
    expect(result.files).toContain("getting-started");
  });

  it("should retrieve specific documentation file", async () => {
    const result = await testContext.callTool("assistantUIDocs", {
      paths: ["getting-started"],
    });

    expect(result.path).toBe("getting-started");
    expect(result.found).toBe(true);
    expect(result.type).toBe("file");
    expect(result.content).toBeDefined();
    expect(result.content).toContain("Getting Started");
  });

  it("should handle non-existent paths", async () => {
    const result = await testContext.callTool("assistantUIDocs", {
      paths: ["non-existent-path"],
    });

    expect(result.error).toBeDefined();
    expect(result.error).toContain("Documentation not found");
    expect(result.suggestions).toBeDefined();
  });

  it("should support multiple path requests", async () => {
    const result = await testContext.callTool("assistantUIDocs", {
      paths: ["getting-started", "api-reference/primitives/Thread"],
    });

    expect(result.results).toBeDefined();
    expect(result.results).toHaveLength(2);
    expect(result.results[0].path).toBe("getting-started");
    expect(result.results[1].path).toBe("api-reference/primitives/Thread");
  });

  it("should list directory contents with files", async () => {
    const result = await testContext.callTool("assistantUIDocs", {
      paths: ["api-reference/primitives"],
    });

    expect(result.path).toBe("api-reference/primitives");
    expect(result.found).toBe(true);
    expect(result.type).toBe("directory");
    expect(result.files).toContain("Thread");
    expect(result.files).toContain("Message");
    expect(result.files).toContain("Composer");
  });

  it("should parse MDX files with frontmatter", async () => {
    const result = await testContext.callTool("assistantUIDocs", {
      paths: ["getting-started"],
    });

    expect(result.content).toBeDefined();
    expect(result.content).toContain("title:");
    expect(result.content).toContain("Getting Started");
  });

  it("should skip symlinks and large files", async () => {
    const mockedLstat = vi.mocked(fs.lstat);

    mockedLstat.mockResolvedValueOnce({
      isSymbolicLink: () => true,
      isFile: () => false,
      isDirectory: () => false,
    } as any);

    const symlinkResult = await testContext.callTool("assistantUIDocs", {
      paths: ["symlink-test"],
    });
    expect(symlinkResult.error).toBe(
      "Symlinks are not allowed for security reasons",
    );

    mockedLstat.mockRejectedValueOnce(new Error("ENOENT"));
    mockedLstat.mockResolvedValueOnce({
      isSymbolicLink: () => false,
      isFile: () => true,
      size: 11 * 1024 * 1024,
    } as any);

    const largeFileResult = await testContext.callTool("assistantUIDocs", {
      paths: ["large-file"],
    });
    expect(largeFileResult.error).toContain(
      "File size exceeds maximum allowed size",
    );
  });
});
