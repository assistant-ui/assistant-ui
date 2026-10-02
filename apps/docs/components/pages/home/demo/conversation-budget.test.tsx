// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoUsageState } from "@/lib/demo-usage-client";
import type { SessionState } from "@/lib/session";

const mocks = vi.hoisted(() => ({
  usage: { status: "loading" } as DemoUsageState,
  session: { status: "anonymous" } as SessionState,
  isEmpty: true,
  budgetExhausted: vi.fn(),
  trackDemoSignInClick: vi.fn(),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAuiState: () => mocks.isEmpty,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/demo-usage-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/demo-usage-client")>()),
  useDemoUsage: () => mocks.usage,
  refreshDemoUsage: vi.fn(),
}));

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  useSession: () => mocks.session,
}));

vi.mock("@/lib/analytics", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/analytics")>();
  return {
    ...original,
    analytics: {
      ...original.analytics,
      demo: {
        ...original.analytics.demo,
        budgetExhausted: mocks.budgetExhausted,
      },
    },
  };
});

vi.mock("@/lib/analytics-identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics-identity")>()),
  trackDemoSignInClick: mocks.trackDemoSignInClick,
}));

const spentDay = (resetAt: number, signedIn = false): DemoUsageState => ({
  status: "ready",
  usage: { used: 3, limit: 3, remaining: 0, resetAt, signedIn },
});

// The reported day is held at module scope, so each case loads a fresh copy.
const load = async () => {
  vi.resetModules();
  return (await import("./conversation-budget")).ConversationBudget;
};

beforeEach(() => {
  mocks.session = { status: "anonymous" };
  mocks.isEmpty = true;
});

afterEach(() => {
  cleanup();
});

describe("ConversationBudget analytics", () => {
  it("reports a spent day once across re-renders and remounts", async () => {
    const ConversationBudget = await load();
    const resetAt = Date.now() + 3_600_000;
    mocks.usage = spentDay(resetAt);

    const first = render(<ConversationBudget>composer</ConversationBudget>);
    first.rerender(<ConversationBudget>composer</ConversationBudget>);
    first.unmount();
    render(<ConversationBudget>composer</ConversationBudget>);

    expect(mocks.budgetExhausted).toHaveBeenCalledExactlyOnceWith(false, 3);
  });

  it("does not report a budget with conversations left", async () => {
    const ConversationBudget = await load();
    mocks.usage = {
      status: "ready",
      usage: {
        used: 1,
        limit: 3,
        remaining: 2,
        resetAt: Date.now() + 3_600_000,
        signedIn: false,
      },
    };

    render(<ConversationBudget>composer</ConversationBudget>);

    expect(screen.getByText("composer")).toBeTruthy();
    expect(mocks.budgetExhausted).not.toHaveBeenCalled();
  });

  it("tracks the sign-in the gate offers", async () => {
    const ConversationBudget = await load();
    mocks.usage = spentDay(Date.now() + 3_600_000);

    render(<ConversationBudget>composer</ConversationBudget>);
    const link = screen.getByRole("link", { name: "Sign in" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(mocks.trackDemoSignInClick).toHaveBeenCalledExactlyOnceWith(
      "budget",
    );
  });
});
