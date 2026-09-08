import { describe, it, expect } from "vitest";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { mergePlugins, DEFAULT_SHIKI_THEME } from "../defaults";
import type { PluginConfig, ResolvedPluginConfig } from "../types";
import type {
  CjkPlugin,
  CodeHighlighterPlugin,
  DiagramPlugin,
  MathPlugin,
} from "streamdown";

describe("DEFAULT_SHIKI_THEME", () => {
  it("has light and dark theme", () => {
    expect(DEFAULT_SHIKI_THEME).toEqual(["github-light", "github-dark"]);
  });
});

describe("PluginConfig", () => {
  it("accepts the real plugin instances and the false opt-out", () => {
    const config: PluginConfig = { code, math, cjk, mermaid };
    expect(config).toEqual({ code, math, cjk, mermaid });

    const disabled: PluginConfig = {
      code: false,
      math: false,
      cjk: false,
      mermaid: false,
    };
    expect(Object.values(disabled)).toEqual([false, false, false, false]);
  });

  it("rejects values that are neither a plugin instance nor false", () => {
    const config: PluginConfig = {
      // @ts-expect-error a bare object is not a plugin instance
      code: { type: "code" },
      // @ts-expect-error true is not an opt-in
      math: true,
      // @ts-expect-error a bare object is not a plugin instance
      cjk: { type: "cjk" },
      // @ts-expect-error true is not an opt-in
      mermaid: true,
    };
    expect(Object.keys(config)).toHaveLength(4);
  });
});

describe("mergePlugins", () => {
  const mockCodePlugin = {
    type: "code",
  } as unknown as CodeHighlighterPlugin;
  const mockMathPlugin = { type: "math" } as unknown as MathPlugin;
  const mockCjkPlugin = { type: "cjk" } as unknown as CjkPlugin;
  const mockMermaidPlugin = {
    type: "mermaid",
  } as unknown as DiagramPlugin;

  it("returns empty object when no plugins provided or detected", () => {
    const result = mergePlugins(undefined, {});
    expect(result).toEqual({});
  });

  it("uses default plugins when user provides undefined", () => {
    const defaults: ResolvedPluginConfig = {
      code: mockCodePlugin,
      math: mockMathPlugin,
    };
    const result = mergePlugins(undefined, defaults);
    expect(result).toEqual({
      code: mockCodePlugin,
      math: mockMathPlugin,
    });
  });

  it("uses user plugins over defaults", () => {
    const userCode = { type: "user-code" } as unknown as CodeHighlighterPlugin;
    const userPlugins: PluginConfig = { code: userCode };
    const defaults: ResolvedPluginConfig = { code: mockCodePlugin };

    const result = mergePlugins(userPlugins, defaults);
    expect(result.code).toBe(userCode);
  });

  it("disables plugin when set to false", () => {
    const userPlugins: PluginConfig = { code: false };
    const defaults: ResolvedPluginConfig = { code: mockCodePlugin };

    const result = mergePlugins(userPlugins, defaults);
    expect(result.code).toBeUndefined();
  });

  it("allows mixing user plugins with defaults", () => {
    const userMath = { type: "user-math" } as unknown as MathPlugin;
    const userPlugins: PluginConfig = {
      code: false,
      math: userMath,
    };
    const defaults: ResolvedPluginConfig = {
      code: mockCodePlugin,
      cjk: mockCjkPlugin,
    };

    const result = mergePlugins(userPlugins, defaults);
    expect(result).toEqual({
      math: userMath,
      cjk: mockCjkPlugin,
    });
  });

  it("includes mermaid only when explicitly provided", () => {
    const userPlugins: PluginConfig = { mermaid: mockMermaidPlugin };
    const defaults: ResolvedPluginConfig = { code: mockCodePlugin };

    const result = mergePlugins(userPlugins, defaults);
    expect(result).toEqual({
      code: mockCodePlugin,
      mermaid: mockMermaidPlugin,
    });
  });

  it("does not include mermaid from defaults", () => {
    // mermaid should never be in defaults, but even if it were,
    // it should not be auto-enabled
    const defaults: ResolvedPluginConfig = {
      code: mockCodePlugin,
    };

    const result = mergePlugins(undefined, defaults);
    expect(result.mermaid).toBeUndefined();
  });

  it("excludes mermaid when set to false", () => {
    const userPlugins: PluginConfig = { mermaid: false };
    const result = mergePlugins(userPlugins, {});
    expect(result.mermaid).toBeUndefined();
  });
});
