import { describe, expect, it, vi } from "vitest";
import { thread } from "../matchers/targets";

describe("setupChatTestKit", () => {
  it("registers matchers on the global expect", async () => {
    vi.resetModules();
    const originalExpect = (globalThis as { expect?: unknown }).expect;
    const fakeExpect = { extend: vi.fn() };
    (globalThis as { expect?: unknown }).expect = fakeExpect;

    const { setupChatTestKit } = await import("../setup");
    setupChatTestKit();

    expect(fakeExpect.extend).toHaveBeenCalledOnce();

    (globalThis as { expect?: unknown }).expect = originalExpect;
  });

  it("can be called multiple times without throwing", async () => {
    vi.resetModules();
    const { setupChatTestKit } = await import("../setup");
    setupChatTestKit();
    setupChatTestKit();
    setupChatTestKit();
    expect(
      typeof (expect(thread()) as { toHaveAssistantText?: unknown })
        .toHaveAssistantText,
    ).toBe("function");
  });
});
