import { afterEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return import("./config");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("setup endpoints", () => {
  it("meets the agent on the checkout worker and reads from the docs site in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_DOCS_URL", "");
    const config = await load();
    expect(config.CHECKOUT_BASE_URL).toBe("https://checkout.assistant-ui.com");
    expect(config.DOCS_URL).toBe("https://www.assistant-ui.com");
  });

  it("uses the local servers in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_DOCS_URL", "");
    const config = await load();
    expect(config.CHECKOUT_BASE_URL).toBe("http://localhost:8791");
    expect(config.DOCS_URL).toBe("http://localhost:3000");
  });

  it("takes configured URLs without a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", " https://checkout.test/ ");
    vi.stubEnv("NEXT_PUBLIC_DOCS_URL", "https://docs.test//");
    const config = await load();
    expect(config.CHECKOUT_BASE_URL).toBe("https://checkout.test");
    expect(config.DOCS_URL).toBe("https://docs.test");
  });
});
