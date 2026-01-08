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
});
