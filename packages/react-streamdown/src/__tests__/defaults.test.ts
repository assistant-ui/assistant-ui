import { describe, it, expect, expectTypeOf } from "vitest";
import type { cjk } from "@streamdown/cjk";
import type { code } from "@streamdown/code";
import type { math } from "@streamdown/math";
import type { mermaid } from "@streamdown/mermaid";
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
  it("accepts the real plugin exports and the false opt-out", () => {
    expectTypeOf<{
      code: typeof code;
      math: typeof math;
      cjk: typeof cjk;
      mermaid: typeof mermaid;
    }>().toExtend<PluginConfig>();
    expectTypeOf<{
      code: false;
      math: false;
      cjk: false;
      mermaid: false;
    }>().toExtend<PluginConfig>();
  });

  it("rejects values that are neither a plugin instance nor false", () => {
    // @ts-expect-error a bare object is not a plugin instance
    expectTypeOf<{ code: { type: "code" } }>().toExtend<PluginConfig>();
    // @ts-expect-error true is not an opt-in
    expectTypeOf<{ math: true }>().toExtend<PluginConfig>();
    // @ts-expect-error a bare object is not a plugin instance
    expectTypeOf<{ cjk: { type: "cjk" } }>().toExtend<PluginConfig>();
    // @ts-expect-error true is not an opt-in
    expectTypeOf<{ mermaid: true }>().toExtend<PluginConfig>();
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
