// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { canonicalTokens } from "./tokens.js";

const styleOf = (vars: Record<string, string>): CSSStyleDeclaration =>
  ({
    getPropertyValue: (n: string) => vars[n] ?? "",
    colorScheme: vars["color-scheme"] ?? "",
    backgroundColor: "",
    fontFamily: "Inter",
  }) as unknown as CSSStyleDeclaration;

describe("canonical tokens", () => {
  it("reads shadcn names, wraps bare HSL channels, derives radii", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const { variables } = canonicalTokens(
      el,
      styleOf({
        "--foreground": "222 47% 11%",
        "--primary": "#123456",
        "--radius": "10px",
      }),
    );
    expect(variables["--color-text"]).toBe("hsl(222 47% 11%)");
    expect(variables["--color-accent"]).toBe("#123456");
    expect(variables["--radius-md"]).toBe("10px");
    expect(variables["--radius-sm"]).toBe("calc(10px - 2px)");
    expect(variables["--font-sans"]).toBe("Inter");
    expect(variables["--color-success"]).toBe("#16a34a"); // palette default
  });

  it("uses the dark palette for dark subtrees", () => {
    const el = document.createElement("div");
    const wrap = document.createElement("div");
    wrap.className = "dark";
    wrap.appendChild(el);
    document.body.appendChild(wrap);
    expect(canonicalTokens(el, styleOf({})).variables["--color-text"]).toBe(
      "#fafafa",
    );
  });
});
