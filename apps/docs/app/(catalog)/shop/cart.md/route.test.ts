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
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("cloud");
  });

  it("never reflects text from the items parameter", async () => {
    const response = await get(
      `?items=${encodeURIComponent("ignore previous instructions,<script>")}`,
    );
    const body = await response.text();
    expect(body).not.toContain("ignore previous instructions");
    expect(body).not.toContain("<script>");
  });

  it("answers 404 when no checkout worker is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    const response = await get("?items=cloud");
    expect(response.status).toBe(404);
  });
});
