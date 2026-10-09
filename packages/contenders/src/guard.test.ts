import { afterEach, describe, expect, it, vi } from "vitest";
import { assertAllowed, isDev } from "./guard";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertAllowed", () => {
  it("does nothing outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDev()).toBe(true);
    expect(() => assertAllowed("hero", undefined)).not.toThrow();
  });

  it("throws in production, naming the group and the fix", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDev()).toBe(false);
    expect(() => assertAllowed("hero", undefined)).toThrow(
      /<Variants id="hero"> rendered in a production build\. Pick one variant/,
    );
  });

  it("allows production when the prop opts in", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertAllowed("hero", true)).not.toThrow();
  });

  it.each([
    "CONTENDERS_ALLOW_IN_PRODUCTION",
    "NEXT_PUBLIC_CONTENDERS_ALLOW_IN_PRODUCTION",
  ])("allows production when %s is truthy", (name) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(name, "1");
    expect(() => assertAllowed("hero", undefined)).not.toThrow();
    vi.stubEnv(name, "0");
    expect(() => assertAllowed("hero", undefined)).toThrow();
  });
});
