import { describe, it, expect } from "vitest";
import { testContext } from "./test-setup.js";

describe("assistantUIExamples", () => {
  it("should list all available examples", async () => {
    const result = await testContext.callTool("assistantUIExamples", {});

    expect(result.type).toBe("list");
    expect(result.examples).toBeDefined();
    expect(Array.isArray(result.examples)).toBe(true);
    expect(result.examples.length).toBeGreaterThan(0);
    expect(result.examples).toContain("with-ai-sdk");
    expect(result.examples).toContain("with-langgraph");
    expect(result.total).toBe(result.examples.length);
  });

  it("should retrieve specific example code", async () => {
    const result = await testContext.callTool("assistantUIExamples", {
      example: "with-ai-sdk",
    });

    expect(result.type).toBe("example");
    expect(result.name).toBe("with-ai-sdk");
    expect(result.content).toBeDefined();
    expect(result.content).toContain("# Example: with-ai-sdk");
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
      example: "with-ai-sdk",
    });

    expect(result.content).toContain("package.json");
    expect(result.content).toContain("app/assistant.tsx");
    expect(result.content).toContain("components/assistant-ui/thread.tsx");
  });

  it("should handle empty example parameter", async () => {
    const result = await testContext.callTool("assistantUIExamples", {
      example: undefined,
    });

    expect(result.type).toBe("list");
    expect(result.hint).toBeDefined();
  });
});
