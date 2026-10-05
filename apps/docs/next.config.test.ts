import { afterAll, describe, expect, it, vi } from "vitest";
import { withAui } from "@assistant-ui/next";

vi.mock("@assistant-ui/next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/next")>();
  return { ...actual, withAui: vi.fn(actual.withAui) };
});

// Inspect the real plugins without generating collections in the docs source tree.
vi.stubEnv("_FUMADOCS_MDX", "1");
const { default: config } = await import("./next.config");
const auiInput = vi.mocked(withAui).mock.calls[0]?.[0];
afterAll(() => vi.unstubAllEnvs());

describe("docs Next config composition", () => {
  it("preserves the MDX readiness promise for Next to await", async () => {
    expect(config).toHaveProperty("then", expect.any(Function));

    const resolved = await config;
    expect(resolved.pageExtensions).toContain("mdx");
    expect(resolved).not.toHaveProperty("then");
  });

  it("passes a plain config object to withAui", () => {
    expect(typeof auiInput).toBe("object");
    expect(Object.getPrototypeOf(auiInput)).toBe(Object.prototype);
    expect(auiInput).not.toHaveProperty("then");
  });

  it("keeps both MDX and generative Turbopack loaders", async () => {
    const resolved = await config;
    expect(resolved.turbopack?.rules).toMatchObject({
      "*.{md,mdx}": {
        loaders: [{ loader: "fumadocs-mdx/webpack/mdx" }],
        as: "*.js",
      },
      "*.tsx": {
        loaders: [{ loader: "@assistant-ui/next/loader" }],
      },
    });
  });
});
