import { afterEach, describe, expect, it, vi } from "vitest";

const get = async () => {
  vi.resetModules();
  const { GET } = await import("./route");
  return GET();
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("shop markdown route", () => {
  it("lists every product when the shop is open", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Slug: cloud");
  });

  it("answers 404 when the shop is closed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHOP_ENABLED", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await get()).status).toBe(404);
  });
});
