import { describe, expect, it } from "vitest";
import {
  GENERATIVE_UI_STYLESHEET_HREF,
  generativeUiStylesheet,
} from "@/components/generative-ui-style";
import { GET } from "./route";

describe("generative UI stylesheet", () => {
  it("is served as one cacheable file instead of inline in every page", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    const css = await res.text();
    expect(css).toBe(generativeUiStylesheet);
    expect(css).toContain(".dark {");
    expect(css.length).toBeGreaterThan(10_000);
  });

  it("is linked with a content hash, so a changed stylesheet gets a new url", () => {
    expect(GENERATIVE_UI_STYLESHEET_HREF).toMatch(
      /^\/generative-ui\.css\?v=[0-9a-f]{12}$/,
    );
  });
});
