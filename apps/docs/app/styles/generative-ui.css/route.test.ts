import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { galleryStagingCss } from "@/components/gallery/gallery-staging";
import { GET } from "./route";

describe("generative UI stylesheet", () => {
  it("is one file with the theme variables, the vocabulary and the gallery staging", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    const css = await res.text();
    expect(css).toContain(":root {\n  --aui-");
    expect(css).toContain(".dark {\n  --aui-");
    expect(css).toContain('[data-aui-theme="elements"]');
    expect(css).toContain(galleryStagingCss.trim());
    expect(css.length).toBeGreaterThan(10_000);
  });

  // Inlined, the stylesheet went into every page twice: as a <style> tag and
  // again in the page's flight data (about 96 KB a page).
  it("is linked from the root layout instead of inlined", () => {
    const layout = readFileSync(
      path.join(process.cwd(), "app", "layout.tsx"),
      "utf8",
    );
    expect(layout).toContain('href="/styles/generative-ui.css"');
    expect(layout).not.toMatch(/<style>/);
  });
});
