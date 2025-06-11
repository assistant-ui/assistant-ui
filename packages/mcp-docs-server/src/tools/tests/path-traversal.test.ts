import { describe, it, expect } from "vitest";
import { testContext } from "./test-setup.js";

describe("Path Traversal Security", () => {
  describe("assistantUIDocs tool", () => {
    const maliciousPaths = [
      "../../../../etc/passwd",
      "../../../package.json",
      "..\\..\\..\\windows\\system32",
      "/etc/passwd",
      "docs/../../../sensitive-file",
      "./../../private/keys",
    ];

    maliciousPaths.forEach((path) => {
      it(`should block path traversal attempt: ${path}`, async () => {
        const result = await testContext.callTool("assistantUIDocs", {
          paths: [path],
        });

        expect(result.error).toBeDefined();
        expect(result.error).toContain("Invalid path");
        expect(result.content).toBeUndefined();
      });
    });

    it("should handle multiple paths with one malicious", async () => {
      const result = await testContext.callTool("assistantUIDocs", {
        paths: ["getting-started", "../../../../etc/passwd", "guides"],
      });

      expect(result.results).toBeDefined();
      expect(result.results).toHaveLength(3);

      expect(result.results[0].found).toBe(true);
      expect(result.results[1].error).toContain("Invalid path");
      expect(result.results[2].found).toBe(true);
    });
  });

  describe("assistantUIExamples tool", () => {
    const maliciousExamples = [
      "../../../../etc/passwd",
      "../../../src/index",
      "..\\..\\..\\config",
      "/root/.ssh/id_rsa",
      "examples/../../../private",
    ];

    maliciousExamples.forEach((example) => {
      it(`should block path traversal attempt: ${example}`, async () => {
        const result = await testContext.callTool("assistantUIExamples", {
          example,
        });

        expect(result.error).toBeDefined();
        expect(result.error).toContain("Example not found");
        expect(result.content).toBeUndefined();
      });
    });
  });

  describe("Valid paths should still work", () => {
    it("should allow valid documentation paths", async () => {
      const result = await testContext.callTool("assistantUIDocs", {
        paths: ["getting-started", "api-reference/primitives/Thread"],
      });

      expect(result.results).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.results.every((r: any) => r.found || r.error)).toBe(true);
    });

    it("should allow valid example names", async () => {
      const result = await testContext.callTool("assistantUIExamples", {});

      expect(result.examples).toBeDefined();
      expect(Array.isArray(result.examples)).toBe(true);
    });
  });
});
