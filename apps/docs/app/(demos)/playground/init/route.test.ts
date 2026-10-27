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
  ])("rejects %s before generating registry source", (_, diff) => {
    expect(GET(request(diff)).status).toBe(400);
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
