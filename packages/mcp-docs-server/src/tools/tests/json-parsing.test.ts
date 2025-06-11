import { describe, it, expect, vi } from "vitest";
import { testContext } from "./test-setup.js";
import { docsTools } from "../docs.js";

describe("JSON parsing error handling", () => {
  it("should provide helpful error message for invalid JSON", async () => {
    // Mock the tool to return invalid JSON
    const originalExecute = docsTools.execute;
    docsTools.execute = vi.fn().mockResolvedValue({
      content: [{ text: "invalid json {not valid}" }],
    });

    await expect(
      testContext.callTool("assistantUIDocs", { paths: ["/"] })
    ).rejects.toThrow(/Tool assistantUIDocs returned invalid JSON/);

    await expect(
      testContext.callTool("assistantUIDocs", { paths: ["/"] })
    ).rejects.toThrow(/invalid json \{not valid\}/);

    // Restore original function
    docsTools.execute = originalExecute;
  });
});