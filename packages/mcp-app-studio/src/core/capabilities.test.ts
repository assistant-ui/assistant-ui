import { describe, it, expect } from "vitest";
import {
  CHATGPT_CAPABILITIES,
  MCP_CAPABILITIES,
  hasFeature,
} from "./capabilities";

describe("CHATGPT_CAPABILITIES", () => {
  it("should have chatgpt platform", () => {
    expect(CHATGPT_CAPABILITIES.platform).toBe("chatgpt");
  });

  it("should support core features", () => {
    expect(CHATGPT_CAPABILITIES.callTool).toBe(true);
    expect(CHATGPT_CAPABILITIES.openLink).toBe(true);
  });

  it("should support all display modes", () => {
    expect(CHATGPT_CAPABILITIES.displayModes).toContain("pip");
    expect(CHATGPT_CAPABILITIES.displayModes).toContain("inline");
    expect(CHATGPT_CAPABILITIES.displayModes).toContain("fullscreen");
  });

  it("should support ChatGPT-specific features", () => {
    expect(CHATGPT_CAPABILITIES.fileUpload).toBe(true);
    expect(CHATGPT_CAPABILITIES.fileDownload).toBe(true);
    expect(CHATGPT_CAPABILITIES.widgetState).toBe(true);
    expect(CHATGPT_CAPABILITIES.modal).toBe(true);
    expect(CHATGPT_CAPABILITIES.closeWidget).toBe(true);
  });

  it("should not support MCP-specific features", () => {
    expect(CHATGPT_CAPABILITIES.logging).toBe(false);
    expect(CHATGPT_CAPABILITIES.partialToolInput).toBe(false);
    expect(CHATGPT_CAPABILITIES.toolCancellation).toBe(false);
    expect(CHATGPT_CAPABILITIES.teardown).toBe(false);
    expect(CHATGPT_CAPABILITIES.modelContext).toBe(false);
  });
});

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

  it("should not support ChatGPT-specific features", () => {
    expect(MCP_CAPABILITIES.fileUpload).toBe(false);
    expect(MCP_CAPABILITIES.fileDownload).toBe(false);
    expect(MCP_CAPABILITIES.widgetState).toBe(false);
    expect(MCP_CAPABILITIES.modal).toBe(false);
    expect(MCP_CAPABILITIES.closeWidget).toBe(false);
  });
});

describe("capability parity", () => {
  it("should have same shape for both platforms", () => {
    const chatgptKeys = Object.keys(CHATGPT_CAPABILITIES).sort();
    const mcpKeys = Object.keys(MCP_CAPABILITIES).sort();

    expect(chatgptKeys).toEqual(mcpKeys);
  });
});

describe("hasFeature", () => {
  it("returns true for available ChatGPT features", () => {
    expect(hasFeature(CHATGPT_CAPABILITIES, "widgetState")).toBe(true);
    expect(hasFeature(CHATGPT_CAPABILITIES, "fileUpload")).toBe(true);
    expect(hasFeature(CHATGPT_CAPABILITIES, "fileDownload")).toBe(true);
    expect(hasFeature(CHATGPT_CAPABILITIES, "modal")).toBe(true);
    expect(hasFeature(CHATGPT_CAPABILITIES, "closeWidget")).toBe(true);
  });

  it("returns true for available MCP features", () => {
    expect(hasFeature(MCP_CAPABILITIES, "modelContext")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "logging")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "partialToolInput")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "toolCancellation")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "teardown")).toBe(true);
  });

  it("returns true for common features on both platforms", () => {
    expect(hasFeature(CHATGPT_CAPABILITIES, "callTool")).toBe(true);
    expect(hasFeature(CHATGPT_CAPABILITIES, "openLink")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "callTool")).toBe(true);
    expect(hasFeature(MCP_CAPABILITIES, "openLink")).toBe(true);
  });

  it("returns false for unavailable features", () => {
    expect(hasFeature(CHATGPT_CAPABILITIES, "modelContext")).toBe(false);
    expect(hasFeature(CHATGPT_CAPABILITIES, "logging")).toBe(false);
    expect(hasFeature(MCP_CAPABILITIES, "widgetState")).toBe(false);
    expect(hasFeature(MCP_CAPABILITIES, "fileUpload")).toBe(false);
  });

  it("returns false for null capabilities", () => {
    expect(hasFeature(null, "callTool")).toBe(false);
    expect(hasFeature(null, "widgetState")).toBe(false);
    expect(hasFeature(null, "modelContext")).toBe(false);
  });
});
