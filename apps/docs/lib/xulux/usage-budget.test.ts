import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const MEMORY_ENV = {
  XULUX_USAGE_BUDGET_STORE: "memory",
  XULUX_DAILY_BUDGET_USD: "1",
  XULUX_DAILY_BUDGET_PER_IP_USD: "2",
  XULUX_CHAT_BUDGET_USD: "100",
  XULUX_MAX_TURNS_PER_CHAT: "100",
  XULUX_MAX_CHATS_PER_DAY: "100",
};

// One million output tokens cost $0.42, so three turns pass the $1 cap.
const turnUsage = { outputTokens: 1_000_000 };

async function loadBudget() {
  vi.resetModules();
  return import("./usage-budget");
}

async function spend(
  budget: Awaited<ReturnType<typeof loadBudget>>,
  sessionId: string,
  networkId: string | null,
  turns: number,
) {
  for (let turn = 0; turn < turns; turn++) {
    const { denied, budgetDate } = await budget.beginTurn(
      `${sessionId}:chat`,
      sessionId,
      networkId,
    );
    if (denied) return denied;
    await budget.finishTurn(
      `${sessionId}:chat`,
      sessionId,
      turnUsage,
      budgetDate,
      networkId,
    );
  }
  return null;
}

beforeEach(() => {
  for (const [key, value] of Object.entries(MEMORY_ENV)) {
    vi.stubEnv(key, value);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("xulux usage budget", () => {
  it("caps one session's daily spend", async () => {
    const budget = await loadBudget();
    const denied = await spend(budget, "session-a", "203.0.113.7", 4);
    expect(denied?.status).toBe(429);
    expect((await denied!.json()).code).toBe("DAILY_BUDGET_EXCEEDED");
  });

  it("caps the daily spend across new sessions from one IP", async () => {
    const budget = await loadBudget();
    // Each session stays under its own $1 cap ($0.84 for two turns), and
    // together they reach the $2 cap for the IP ($2.10 after five turns).
    expect(await spend(budget, "session-a", "203.0.113.7", 2)).toBeNull();
    expect(await spend(budget, "session-b", "203.0.113.7", 2)).toBeNull();
    expect(await spend(budget, "session-c", "203.0.113.7", 1)).toBeNull();

    const denied = await spend(budget, "session-d", "203.0.113.7", 1);
    expect((await denied!.json()).code).toBe("DAILY_BUDGET_EXCEEDED");
  });

  it("keeps other IPs and requests without a known IP apart", async () => {
    const budget = await loadBudget();
    for (const session of ["a", "b", "c"]) {
      await spend(budget, `session-${session}`, "203.0.113.7", 2);
    }
    expect(await spend(budget, "session-d", "203.0.113.7", 1)).not.toBeNull();

    expect(await spend(budget, "session-e", "198.51.100.4", 1)).toBeNull();
    expect(await spend(budget, "session-f", null, 1)).toBeNull();
  });
});
