import { describe, expect, it } from "vitest";
import {
  MARKDOWN_RESPONSE_HEADERS,
  PLAIN_TEXT_RESPONSE_HEADERS,
} from "./markdown-response";

describe("markdown response headers", () => {
  it("keeps browsers fresh while allowing shared caches to reuse markdown", () => {
    expect(MARKDOWN_RESPONSE_HEADERS).toEqual({
      "Cache-Control":
        "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    });
  });

  it("uses plain text for the combined llms document", () => {
    expect(PLAIN_TEXT_RESPONSE_HEADERS["Content-Type"]).toBe(
      "text/plain; charset=utf-8",
    );
  });
});
