import { describe, expect, it } from "vitest";
import { createMarkdownResponse } from "./markdown-response";

describe("markdown response headers", () => {
  it("provides a validator for always-fresh markdown", async () => {
    const response = createMarkdownResponse("# Documentation");

    expect(await response.text()).toBe("# Documentation");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("ETag")).toMatch(/^"sha256-[\w-]+"$/);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("uses plain text without changing the cache policy", () => {
    const response = createMarkdownResponse(
      "# Documentation",
      "text/plain; charset=utf-8",
    );

    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("ETag")).toMatch(/^"sha256-[\w-]+"$/);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("changes the validator when the content changes", () => {
    expect(createMarkdownResponse("first").headers.get("ETag")).not.toBe(
      createMarkdownResponse("second").headers.get("ETag"),
    );
  });
});
