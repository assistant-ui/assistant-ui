import { describe, expect, it } from "vitest";
import { validateFrontendToolsInput } from "./validate-input";

describe("validateFrontendToolsInput", () => {
  it("accepts a bounded frontend tool definition", () => {
    expect(
      validateFrontendToolsInput({
        search: {
          description: "Search documentation",
          parameters: { type: "object", properties: {} },
        },
      }),
    ).toBeNull();
  });

  it("rejects frontend tool definitions that exceed the request budget", async () => {
    const response = validateFrontendToolsInput({
      search: {
        description: "x".repeat(96_000),
        parameters: { type: "object", properties: {} },
      },
    });

    expect(response?.status).toBe(400);
    await expect(response?.text()).resolves.toBe("Tools too large");
  });
});
