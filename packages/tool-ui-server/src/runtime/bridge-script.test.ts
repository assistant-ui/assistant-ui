import { describe, it, expect } from "vitest";
import { generateBridgeScript, DEFAULT_GLOBALS } from "./bridge-script";

describe("generateBridgeScript", () => {
  it("generates valid JavaScript", () => {
    const script = generateBridgeScript();
    expect(() => new Function(script)).not.toThrow();
  });

  it("includes default globals", () => {
    const script = generateBridgeScript();
    expect(script).toContain(JSON.stringify(DEFAULT_GLOBALS));
  });

  it("defines window.aui", () => {
    const script = generateBridgeScript();
    expect(script).toContain('Object.defineProperty(window, "aui"');
  });

  it("includes all API methods", () => {
    const script = generateBridgeScript();
    expect(script).toContain("callTool");
    expect(script).toContain("setWidgetState");
    expect(script).toContain("sendFollowUpMessage");
    expect(script).toContain("requestDisplayMode");
    expect(script).toContain("requestModal");
    expect(script).toContain("requestClose");
    expect(script).toContain("openExternal");
    expect(script).toContain("notifyIntrinsicHeight");
  });

  it("includes timeout handling", () => {
    const script = generateBridgeScript();
    expect(script).toContain("30000");
    expect(script).toContain("timed out");
  });

  describe("OpenAI namespace compatibility", () => {
    it("defines window.openai as alias to window.aui", () => {
      const script = generateBridgeScript();
      expect(script).toContain('Object.defineProperty(window, "openai"');
      expect(script).toContain("value: window.aui");
    });

    it("includes previousDisplayMode property", () => {
      const script = generateBridgeScript();
      expect(script).toContain("previousDisplayMode");
    });

    it("includes view property", () => {
      const script = generateBridgeScript();
      expect(script).toContain("view");
    });

    it("dispatches both aui and openai events", () => {
      const script = generateBridgeScript();
      expect(script).toContain('CustomEvent("aui:set_globals"');
      expect(script).toContain('CustomEvent("openai:set_globals"');
    });

    it("handles OPENAI_SET_GLOBALS message type", () => {
      const script = generateBridgeScript();
      expect(script).toContain("OPENAI_SET_GLOBALS");
    });

    it("handles OPENAI_METHOD_RESPONSE message type", () => {
      const script = generateBridgeScript();
      expect(script).toContain("OPENAI_METHOD_RESPONSE");
    });
  });
});
