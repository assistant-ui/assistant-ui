import { describe, it, expect } from "vitest";
import { MCP_CAPABILITIES, hasFeature } from "./capabilities";

describe("MCP_CAPABILITIES", () => {
  it("should have mcp platform", () => {
    expect(MCP_CAPABILITIES.platform).toBe("mcp");
  });

  it("should support core features", () => {
    expect(MCP_CAPABILITIES.callTool).toBe(true);
    expect(MCP_CAPABILITIES.openLink).toBe(true);
  });

  it("should support all display modes", () => {
    expect(MCP_CAPABILITIES.displayModes).toContain("inline");
    expect(MCP_CAPABILITIES.displayModes).toContain("fullscreen");
    expect(MCP_CAPABILITIES.displayModes).toContain("pip");
  });

  it("should support MCP-specific features", () => {
    expect(MCP_CAPABILITIES.logging).toBe(true);
    expect(MCP_CAPABILITIES.partialToolInput).toBe(true);
    expect(MCP_CAPABILITIES.toolCancellation).toBe(true);
    expect(MCP_CAPABILITIES.teardown).toBe(true);
    expect(MCP_CAPABILITIES.modelContext).toBe(true);
  });

  it("should not assume ChatGPT-only extensions are present", () => {
    expect(MCP_CAPABILITIES.fileUpload).toBe(false);
    expect(MCP_CAPABILITIES.fileDownload).toBe(false);
    expect(MCP_CAPABILITIES.widgetState).toBe(false);
    expect(MCP_CAPABILITIES.modal).toBe(false);
    expect(MCP_CAPABILITIES.closeWidget).toBe(false);
  });
});

describe("hasFeature", () => {
  it("returns true for available MCP features", () => {
    expect(hasFeature(MCP_CAPABILITIES, "modelContext")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "logging")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "partialToolInput")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "toolCancellation")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "teardown")).toBe(true);
  });

  it("returns true for common features on both platforms", () => {
    expect(hasFeature(MCP_CAPABILITIES, "callTool")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "openLink")).toBe(true);
  });

  it("returns false for unavailable features", () => {
    expect(hasFeature(MCP_CAPABILITIES, "widgetState")).toBe(false);
    expect(hasFeature(MCP_CAPABILITIES, "fileUpload")).toBe(false);
  });

  it("returns false for null capabilities", () => {
    expect(hasFeature(null, "callTool")).toBe(false);
    expect(hasFeature(null, "widgetState")).toBe(false);
    expect(hasFeature(null, "modelContext")).toBe(false);
  });
});
