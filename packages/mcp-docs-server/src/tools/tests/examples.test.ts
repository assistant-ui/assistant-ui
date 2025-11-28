import { describe, it, expect, vi } from "vitest";
import { testContext } from "./test-setup.js";
import * as fs from "node:fs/promises";

vi.mock("fs/promises", async () => {
  const { readdir, readFile, lstat } = await import("node:fs/promises");
  return {
    readdir,
    readFile,
    lstat: vi.fn(lstat),
  };
});

describe("assistantUIExamples", () => {
  it("should list all available examples", async () => {
    const result = await testContext.callTool("assistantUIExamples", {});

    expect(result.type).toBe("list");
    expect(result.examples).toBeDefined();
    expect(Array.isArray(result.examples)).toBe(true);
    expect(result.examples.length).toBeGreaterThan(0);
    expect(result.examples).toContain("with-ai-sdk-v5");
    expect(result.examples).toContain("with-langgraph");
    expect(result.total).toBe(result.examples.length);
  });

  it("should retrieve specific example code", async () => {
    const result = await testContext.callTool("assistantUIExamples", {
      example: "with-ai-sdk-v5",
    });

    expect(result.type).toBe("example");
    expect(result.name).toBe("with-ai-sdk-v5");
    expect(result.content).toBeDefined();
    expect(result.content).toContain("# Example: with-ai-sdk-v5");
    expect(result.content).toContain("app/api/chat/route.ts");
    expect(result.content).toContain("streamText");
  });

  it("should handle non-existent examples", async () => {
    const result = await testContext.callTool("assistantUIExamples", {
      example: "non-existent-example",
    });

    expect(result.error).toBeDefined();
    expect(result.error).toContain("Example not found");
    expect(result.availableExamples).toBeDefined();
    expect(Array.isArray(result.availableExamples)).toBe(true);
  });

  it("should include all files in example", async () => {
    const result = await testContext.callTool("assistantUIExamples", {
      example: "with-ai-sdk-v5",
    });

    expect(result.content).toContain("package.json");
    expect(result.content).toContain("components/assistant-ui/thread.tsx");
  });

  it("should handle empty example parameter", async () => {
    const result = await testContext.callTool("assistantUIExamples", {
      example: undefined,
    });

    expect(result.type).toBe("list");
    expect(result.hint).toBeDefined();
  });

  it("should skip symlinks and large files", async () => {
    const mockedLstat = vi.mocked(fs.lstat);

    mockedLstat.mockResolvedValueOnce({
      isSymbolicLink: () => true,
      isFile: () => false,
      size: 0,
    } as any);

    const symlinkResult = await testContext.callTool("assistantUIExamples", {
      example: "symlink-example",
    });
    expect(symlinkResult.error).toContain("Example not found");

    mockedLstat.mockResolvedValueOnce({
      isSymbolicLink: () => false,
      isFile: () => true,
      size: 11 * 1024 * 1024, // 11MB - exceeds MAX_FILE_SIZE
    } as any);

    const largeFileResult = await testContext.callTool("assistantUIExamples", {
      example: "large-example",
    });
    expect(largeFileResult.error).toContain("Example not found");
  });
});
