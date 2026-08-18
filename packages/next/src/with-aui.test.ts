import { describe, expect, it, vi } from "vitest";
import { withAui } from "./with-aui";

const rulesFor = (config: Parameters<typeof withAui>[0]) =>
  withAui(config).turbopack?.rules ?? {};

const ourRule = (rule: unknown) =>
  (Array.isArray(rule) ? rule.at(-1) : rule) as {
    condition: { content: RegExp };
    loaders: { loader: string }[];
  };

describe("withAui", () => {
  it("adds a directive-conditioned rule for each default glob", () => {
    const rules = rulesFor({});

    expect(Object.keys(rules)).toEqual(["*.ts", "*.tsx"]);
    for (const glob of ["*.ts", "*.tsx"]) {
      const rule = ourRule(rules[glob]);
      expect(rule.loaders).toHaveLength(1);
      expect(rule.loaders[0]!.loader).toBe("@assistant-ui/next/loader");
      expect(rule.condition.content.test('"use generative";')).toBe(true);
      expect(rule.condition.content.test("export const a = 1;")).toBe(false);
    }
  });

  it("matches the directive more loosely than the compiler detects it", () => {
    // The condition language cannot express a leading, syntactically valid
    // directive. A module matched in error reaches the loader and comes back
    // untouched; one missed would silently ship uncompiled.
    const { content } = ourRule(rulesFor({})["*.ts"]).condition;

    expect(content.test("'use generative';")).toBe(true);
    expect(content.test('"use client";\n"use generative";')).toBe(true);
    expect(content.test('// mentions "use generative" in prose')).toBe(true);
  });

  it("honors custom globs", () => {
    expect(
      Object.keys(
        withAui({}, { rules: ["*.generative.tsx"] }).turbopack?.rules ?? {},
      ),
    ).toEqual(["*.generative.tsx"]);
  });

  it("leaves a caller's rule on the same glob untouched", () => {
    const existing = { loaders: ["some-loader"], as: "*.js" };
    const rule = rulesFor({ turbopack: { rules: { "*.ts": existing } } })[
      "*.ts"
    ];

    expect(rule).toEqual([existing, ourRule(rule)]);
  });

  it("does not narrow a caller's own condition", () => {
    const existing = { condition: "browser", loaders: ["some-loader"] };
    const rule = rulesFor({ turbopack: { rules: { "*.tsx": existing } } })[
      "*.tsx"
    ];

    expect((rule as unknown[])[0]).toEqual(existing);
  });

  it("appends to a caller's array of rules rather than spreading it", () => {
    const existing = [
      { condition: "browser", loaders: ["a"] },
      { loaders: ["b"] },
    ];
    const rule = rulesFor({ turbopack: { rules: { "*.ts": existing } } })[
      "*.ts"
    ];

    expect(rule).toEqual([...existing, ourRule(rule)]);
  });

  it("keeps rules for globs it does not touch", () => {
    const svg = { loaders: ["@svgr/webpack"] };

    expect(rulesFor({ turbopack: { rules: { "*.svg": svg } } })["*.svg"]).toBe(
      svg,
    );
  });

  it("reads options from the `aui` config key and strips it", () => {
    const result = withAui({
      aui: { rules: ["*.generative.tsx"], backendless: true },
    });

    expect("aui" in result).toBe(false);
    const rules = result.turbopack?.rules ?? {};
    expect(Object.keys(rules)).toEqual(["*.generative.tsx"]);
    expect(ourRule(rules["*.generative.tsx"]).loaders[0]).toMatchObject({
      options: { backendless: true },
    });
  });

  it("delegates to the caller's webpack function", () => {
    const userWebpack = vi.fn((config) => config);
    const config = { module: { rules: [] as unknown[] } };

    withAui({ webpack: userWebpack }).webpack!(config, {});

    expect(userWebpack).toHaveBeenCalledWith(config, {});
    expect(config.module.rules).toHaveLength(1);
  });
});
