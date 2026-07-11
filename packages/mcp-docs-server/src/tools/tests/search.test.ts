import { describe, it, expect } from "vitest";
import { testContext } from "./test-setup.js";

describe("assistantUISearch", () => {
  it("returns ranked matches for a known term", async () => {
    const result = await testContext.callTool("assistantUISearch", {
      query: "thread",
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.results[0].path).toBeDefined();
    expect(result.results[0].title).toBeDefined();
    expect(result.results[0].snippet).toBeDefined();
  });

  it("returns no matches for a nonsense query", async () => {
    const result = await testContext.callTool("assistantUISearch", {
      query: "zzzqqxnotarealdocterm",
    });
    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("respects the limit", async () => {
    const result = await testContext.callTool("assistantUISearch", {
      query: "ui",
      limit: 3,
    });
    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  it("defaults to at most 10 results when no limit is given", async () => {
    const result = await testContext.callTool("assistantUISearch", {
      query: "ui",
    });
    expect(result.results.length).toBeLessThanOrEqual(10);
  });
});
