import { describe, expect, it } from "vitest";
import {
  resolveQuickStartRegistryUrl,
  resolveRegistryItemUrl,
} from "./registry";

describe("resolveQuickStartRegistryUrl", () => {
  it("uses the base quick start for base styles", () => {
    expect(resolveQuickStartRegistryUrl("base-nova")).toBe(
      "https://r.assistant-ui.com/base/chat/b/ai-sdk-quick-start/json",
    );
  });

  it("uses the radix quick start for radix styles", () => {
    expect(resolveQuickStartRegistryUrl("radix-nova")).toBe(
      "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
    );
  });

  it("uses the base quick start without a style", () => {
    expect(resolveQuickStartRegistryUrl()).toBe(
      "https://r.assistant-ui.com/base/chat/b/ai-sdk-quick-start/json",
    );
  });
});

describe("resolveRegistryItemUrl", () => {
  it("uses the style scoped URL for base styles", () => {
    expect(resolveRegistryItemUrl("thread", "base-nova")).toBe(
      "https://r.assistant-ui.com/styles/base-nova/thread.json",
    );
  });

  it("uses the plain URL for non-base styles", () => {
    expect(resolveRegistryItemUrl("thread", "nova")).toBe(
      "https://r.assistant-ui.com/thread.json",
    );
  });

  it("uses the plain URL without a style", () => {
    expect(resolveRegistryItemUrl("thread")).toBe(
      "https://r.assistant-ui.com/thread.json",
    );
  });

  it("keeps the style inside a single path segment", () => {
    expect(resolveRegistryItemUrl("thread", "base-nova?preview=1")).toBe(
      "https://r.assistant-ui.com/styles/base-nova%3Fpreview%3D1/thread.json",
    );
  });
});
