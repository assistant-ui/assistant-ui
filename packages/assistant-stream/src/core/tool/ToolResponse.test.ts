import { describe, expect, it, vi } from "vitest";
import { NO_RESULT, ToolResponse } from "./ToolResponse";

describe("ToolResponse", () => {
  describe("constructor", () => {
    it("materializes an absent result", () => {
      expect(new ToolResponse({ result: undefined }).result).toBe(NO_RESULT);
    });

    it.each([
      ["false", false],
      ["zero", 0],
      ["an empty string", ""],
      ["null", null],
    ])("keeps %s as the result", (_label, result) => {
      expect(new ToolResponse({ result }).result).toBe(result);
    });

    it("defaults isError to false", () => {
      expect(new ToolResponse({ result: "ok" }).isError).toBe(false);
    });
  });

  describe("toResponse", () => {
    it("returns existing responses unchanged across module instances", async () => {
      const response = new ToolResponse({ result: "ok" });
      expect(ToolResponse.toResponse(response)).toBe(response);

      vi.resetModules();
      const { ToolResponse: OtherToolResponse } =
        await import("./ToolResponse");
      expect(OtherToolResponse).not.toBe(ToolResponse);

      const otherResponse = new OtherToolResponse({ result: "ok" });
      expect(ToolResponse.toResponse(otherResponse)).toBe(otherResponse);
    });

    it("materializes an absent result", () => {
      expect(ToolResponse.toResponse(undefined).result).toBe(NO_RESULT);
    });

    it("wraps a plain value", () => {
      expect(ToolResponse.toResponse({ temp: 20 }).result).toEqual({
        temp: 20,
      });
    });
  });
});
