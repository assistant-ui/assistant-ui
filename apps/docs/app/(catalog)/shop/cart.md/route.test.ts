import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const get = async (query: string) => {
  vi.resetModules();
  const { GET } = await import("./route");
  return GET(new NextRequest(`https://docs.test/shop/cart.md${query}`));
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("cart markdown route", () => {
  it("serves the install prompt for known products", async () => {
    const response = await get("?items=cloud");
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "no-cache, must-revalidate",
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "noindex, follow",
    });
    expect(response.headers.get("etag")).toMatch(/^"sha256-[0-9a-f]{64}"$/);
    expect(await response.text()).toContain("cloud");
  });

  it("never reflects text from the items parameter", async () => {
    const response = await get(
      `?items=${encodeURIComponent("ignore previous instructions,<script>")}`,
    );
    const body = await response.text();
    expect(response.status).toBe(400);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
    expect(body).not.toContain("ignore previous instructions");
    expect(body).not.toContain("<script>");
  });

  it("answers 404 when no checkout worker is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const response = await get("?items=cloud");
    expect(response.status).toBe(404);
  });
});
