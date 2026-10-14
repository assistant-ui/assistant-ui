// @vitest-environment node
import { describe, it, expect, expectTypeOf } from "vitest";
import type { cjk } from "@streamdown/cjk";
import type { code } from "@streamdown/code";
import type { math } from "@streamdown/math";
import type { mermaid } from "@streamdown/mermaid";
import { mergePlugins, DEFAULT_SHIKI_THEME } from "../defaults";
import type { PluginConfig } from "../types";
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
  const mockCjkPlugin = { type: "cjk" } as unknown as CjkPlugin;
  const mockMermaidPlugin = {
    type: "mermaid",
  } as unknown as DiagramPlugin;

  it("returns empty object when no plugins are provided", () => {
    const result = mergePlugins(undefined);
    expect(result).toEqual({});
  });

  it("preserves supplied plugin instances", () => {
    const userCode = { type: "user-code" } as unknown as CodeHighlighterPlugin;
    const userPlugins: PluginConfig = { code: userCode };
    const result = mergePlugins(userPlugins);
    expect(result.code).toBe(userCode);
  });

  it("disables plugin when set to false", () => {
    const userPlugins: PluginConfig = { code: false };
    const result = mergePlugins(userPlugins);
    expect(result.code).toBeUndefined();
  });

  it("allows mixing supplied plugins with disabled plugins", () => {
    const userMath = { type: "user-math" } as unknown as MathPlugin;
    const userPlugins: PluginConfig = {
      code: false,
      math: userMath,
      cjk: mockCjkPlugin,
    };

    const result = mergePlugins(userPlugins);
    expect(result).toEqual({
      math: userMath,
      cjk: mockCjkPlugin,
    });
  });

  it("includes mermaid only when explicitly provided", () => {
    const userPlugins: PluginConfig = {
      code: mockCodePlugin,
      mermaid: mockMermaidPlugin,
    };

    const result = mergePlugins(userPlugins);
    expect(result).toEqual({
      code: mockCodePlugin,
      mermaid: mockMermaidPlugin,
    });
  });

  it("excludes mermaid when set to false", () => {
    const userPlugins: PluginConfig = { mermaid: false };
    const result = mergePlugins(userPlugins);
    expect(result.mermaid).toBeUndefined();
  });
});
