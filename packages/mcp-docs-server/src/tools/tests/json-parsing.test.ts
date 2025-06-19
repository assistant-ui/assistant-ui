import { describe, it, expect, vi, afterEach } from "vitest";
import { testContext } from "./test-setup.js";
import { docsTools } from "../docs.js";

describe("JSON parsing error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should provide helpful error message for invalid JSON", async () => {
    vi.spyOn(docsTools, "execute").mockResolvedValue({
      content: [{ text: "invalid json {not valid}" }],
    });

    await expect(
      testContext.callTool("assistantUIDocs", { paths: ["/"] }),
    ).rejects.toThrow(/Tool assistantUIDocs returned invalid JSON/);

    await expect(
      testContext.callTool("assistantUIDocs", { paths: ["/"] }),
    ).rejects.toThrow(/invalid json \{not valid\}/);
  });
});
