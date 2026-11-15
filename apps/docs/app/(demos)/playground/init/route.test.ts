import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DEFAULT_CONFIG } from "@/components/pages/playground/types";
import { encodeConfig } from "@/lib/playground-config-codec";
import { GET } from "./route";

function request(diff: unknown) {
  const encoded = Buffer.from(JSON.stringify(diff)).toString("base64url");
  return new NextRequest(
    `https://www.assistant-ui.com/playground/init?c=${encoded}`,
  );
}

describe("GET /playground/init", () => {
  it("rejects decoded configuration with an invalid field", async () => {
    const response = GET(request({ components: { markdown: "yes" } }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid configuration encoding",
    });
  });

  it.each<[string, unknown]>([
    [
      "JSX markup in loading text",
      { components: { loadingText: "</span><script>bad()</script>" } },
    ],
    [
      "quotes in the font family",
      { styles: { fontFamily: 'system-ui", onClick: bad()' } },
    ],
    [
      "quotes in the max width",
      { styles: { maxWidth: '44rem", onClick: bad()' } },
    ],
    [
      "a declaration break in a color",
      {
        styles: {
          colors: { accent: { light: "red; } body { display: none" } },
        },
      },
    ],
    ["an unknown top-level key", { files: [{ content: "bad()" }] }],
    ["an unknown component key", { components: { extra: "bad()" } }],
    ["an unknown style key", { styles: { colors: { other: "red" } } }],
    [
      "a prototype key",
      JSON.parse('{"styles":{"__proto__":{"maxWidth":"1px"}}}'),
    ],
    ["a long loading text", { components: { loadingText: "a".repeat(81) } }],
    ["a parenthesis in the font family", { styles: { fontFamily: "a(b)" } }],
    ["a backtick in the max width", { styles: { maxWidth: "`${bad()}`" } }],
    [
      "a line separator in the loading text",
      { components: { loadingText: "a\u2028b" } },
    ],
    [
      "a quote in a color",
      { styles: { colors: { accent: { dark: '#fff"' } } } },
    ],
    ["an out-of-range enum", { styles: { fontSize: "18px" } }],
  ])("rejects %s before generating registry source", (_, diff) => {
    expect(GET(request(diff)).status).toBe(400);
  });

  it("rejects an oversized encoded configuration", () => {
    const response = GET(
      new NextRequest(
        `https://www.assistant-ui.com/playground/init?c=${"a".repeat(32_001)}`,
      ),
    );
    expect(response.status).toBe(400);
  });

  it("rejects an encoding that is not JSON", () => {
    const response = GET(
      new NextRequest(
        `https://www.assistant-ui.com/playground/init?c=${Buffer.from("{bad").toString("base64url")}`,
      ),
    );
    expect(response.status).toBe(400);
  });

  it("accepts the values the builder offers", async () => {
    const response = GET(
      request({
        components: { loadingText: "Hang on, it's coming..." },
        styles: {
          fontFamily: '"Inter Variable", Georgia, serif',
          maxWidth: "calc(100% - 2rem)",
          colors: {
            accent: { light: "oklch(0.7 0.15 250 / 80%)", dark: "#0ea5e9" },
            background: { light: "rgb(255, 255, 255)", dark: "black" },
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    const content: string = (await response.json()).files[0].content;
    expect(content).toContain(
      'fontFamily: "\\"Inter Variable\\", Georgia, serif",',
    );
    expect(content).toContain(
      '["--thread-max-width" as string]: "calc(100% - 2rem)",',
    );
    expect(content).toContain(
      '<span className="text-sm">{"Hang on, it\'s coming..."}</span>',
    );
  });

  it("generates a registry from a valid encoded configuration", async () => {
    const config = {
      ...DEFAULT_CONFIG,
      components: { ...DEFAULT_CONFIG.components, loadingText: "Working" },
    };
    const response = GET(
      new NextRequest(
        `https://www.assistant-ui.com/playground/init?c=${encodeConfig(config)}`,
      ),
    );

    expect(response.status).toBe(200);
    const registry = await response.json();
    expect(registry.files[0].content).toContain("Working");
  });
});
