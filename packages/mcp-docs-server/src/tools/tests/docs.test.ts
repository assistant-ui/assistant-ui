import { describe, it, expect } from "vitest";
import { testContext } from "./test-setup.js";

describe("assistantUIDocs", () => {
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
});
