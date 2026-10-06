import { afterEach, describe, expect, it, vi } from "vitest";

const loadConfig = async () => {
  vi.resetModules();
  return import("./config");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("checkout config", () => {
  it("uses the configured worker without a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", " https://worker.test/ ");
    const config = await loadConfig();
    expect(config.CHECKOUT_BASE_URL).toBe("https://worker.test");
    expect(config.checkoutEnabled).toBe(true);
  });

  it("falls back to the local worker in development when the variable is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    const config = await loadConfig();
    expect(config.CHECKOUT_BASE_URL).toBe("http://localhost:8791");
  });

  it("stays disabled in production without a configured worker", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const config = await loadConfig();
    expect(config.CHECKOUT_BASE_URL).toBeNull();
    expect(config.checkoutEnabled).toBe(false);
  });
});
