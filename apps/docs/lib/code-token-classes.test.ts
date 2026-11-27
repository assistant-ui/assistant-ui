import { readFileSync } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";
import { describe, expect, it } from "vitest";
import { codeTokenClasses, codeTokenCss } from "./code-token-classes";

const SAMPLE = `import { useState } from "react";

// A comment, a string, a number and a JSX tag.
export function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return <button onClick={() => setCount(count + 1)}>{\`Count: \${count}\`}</button>;
}`;

const highlight = (transformers: ReturnType<typeof codeTokenClasses>[]) =>
  codeToHtml(SAMPLE, {
    lang: "tsx",
    themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
    defaultColor: false,
    transformers,
  });

describe("code token classes", () => {
  it("keeps styles/code-tokens.css in sync with the palette", () => {
    const file = path.join(process.cwd(), "styles", "code-tokens.css");
    // On a mismatch, run `pnpm exec tsx scripts/generate-code-tokens.mts`.
    expect(readFileSync(file, "utf8")).toBe(codeTokenCss());
  });

  it("replaces every inline token color with classes", async () => {
    const html = await highlight([codeTokenClasses()]);
    const spans = html.match(/<span class="(?!line)[^"]*"[^>]*>/g) ?? [];
    expect(spans.length).toBeGreaterThan(20);
    expect(html).not.toMatch(/<span[^>]*style="--shiki-(light|dark):#/);
    expect(html).toContain('class="sl-');
    expect(html).toContain(" sd-");
  });

  it("paints the same colors as the inline styles", async () => {
    const inline = await highlight([]);
    const classed = await highlight([codeTokenClasses()]);
    const colors = (html: string) =>
      [
        ...html.matchAll(
          /--shiki-(light|dark):(#[0-9a-f]{6})|s([ld])-([0-9a-f]{6})/gi,
        ),
      ]
        .map((m) =>
          m[1] ? `${m[1][0]}${m[2]!.toLowerCase()}` : `${m[3]}#${m[4]}`,
        )
        .join(" ");
    // The pre keeps its own inline colors; compare the token spans only.
    const tokens = (html: string) => html.slice(html.indexOf("<code>"));
    expect(colors(tokens(classed))).toBe(colors(tokens(inline)));
    expect(tokens(classed).length).toBeLessThan(tokens(inline).length * 0.75);
  });
});
