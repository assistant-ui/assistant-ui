import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readDemoUsage: vi.fn(),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  defineToolkit: <T,>(toolkit: T) => toolkit,
}));

vi.mock("@/lib/demo-usage-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/demo-usage-client")>()),
  readDemoUsage: mocks.readDemoUsage,
}));

import toolkit from "./usage-toolkit";

describe("get_usage", () => {
  it("reports visitor counts and marks a spent shared network", async () => {
    mocks.readDemoUsage.mockResolvedValue({
      used: 1,
      limit: 10,
      remaining: 0,
      resetAt: Date.UTC(2026, 8, 5),
      signedIn: false,
      sharedLimitReached: true,
    });

    await expect(toolkit.get_usage.execute()).resolves.toMatchObject({
      conversationsUsedToday: 1,
      conversationsAllowedPerDay: 10,
      conversationsRemaining: 0,
      sharedNetworkLimitReached: true,
    });
  });

  it("omits the network flag when only the visitor's own budget is spent", async () => {
    mocks.readDemoUsage.mockResolvedValue({
      used: 10,
      limit: 10,
      remaining: 0,
      resetAt: Date.UTC(2026, 8, 5),
      signedIn: false,
    });

    const result = await toolkit.get_usage.execute();

    expect(result.conversationsUsedToday).toBe(10);
    expect(result).not.toHaveProperty("sharedNetworkLimitReached");
  });
});
