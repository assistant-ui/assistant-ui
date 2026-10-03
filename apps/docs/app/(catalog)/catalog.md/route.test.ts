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

describe("catalog markdown route", () => {
  it("lists every product when the shop is open", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Slug: cloud");
    expect(body).toContain("Works out of the box:");
    expect(body).toContain("/install.md?items=");
    expect(body).not.toMatch(/\b(?:cart|shop|checkout)\b/i);
  });

  it("omits hidden Statewire from product and auxiliary listings", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.text()).not.toMatch(/statewire/i);
  });

  it("answers 404 when the shop is closed", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await get()).status).toBe(404);
  });
});
