import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("proxy", () => {
  it("preserves the legacy changelog redirect", () => {
    const response = proxy(
      new NextRequest(
        "https://www.assistant-ui.com/changelog?pkg=react&page=2",
      ),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.assistant-ui.com/changelog/react/2",
    );
  });

  it("preserves the retired analytics endpoint", () => {
    expect(
      proxy(new NextRequest("https://www.assistant-ui.com/umami/api/send"))
        .status,
    ).toBe(204);
  });
});
