import { describe, expect, it } from "vitest";
import type { ToolCallMessagePart } from "@assistant-ui/core";
import { getMCPAppFromToolPart, isMCPAppPart } from "./utils";

const basePart: ToolCallMessagePart = {
  type: "tool-call",
  toolCallId: "c1",
  toolName: "t",
  args: {},
  argsText: "{}",
};

describe("getMCPAppFromToolPart", () => {
  it("returns undefined when no mcp field", () => {
    expect(getMCPAppFromToolPart(basePart)).toBeUndefined();
    expect(isMCPAppPart(basePart)).toBe(false);
  });

  it("returns undefined when mcp.app is missing or invalid", () => {
    expect(getMCPAppFromToolPart({ ...basePart, mcp: {} })).toBeUndefined();
    expect(
      getMCPAppFromToolPart({
        ...basePart,
        mcp: { app: { resourceUri: "https://not-ui-prefix" } },
      }),
    ).toBeUndefined();
  });

  it("returns the app when present and valid", () => {
    const app = { resourceUri: "ui://example/widget" };
    expect(getMCPAppFromToolPart({ ...basePart, mcp: { app } })).toEqual(app);
    expect(isMCPAppPart({ ...basePart, mcp: { app } })).toBe(true);
  });
});
