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
    const { denied, budgetDate, reservedMicroUsd } = await budget.beginTurn(
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
      reservedMicroUsd,
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
    const body = await denied!.json();
    expect(body.code).toBe("NETWORK_DAILY_BUDGET_EXCEEDED");
    expect(body.error).not.toContain("$");
  });

  it("lets only as many concurrent turns start as the budget allows", async () => {
    vi.stubEnv("XULUX_TURN_RESERVE_USD", "0.25");
    const budget = await loadBudget();
    // $1 a day at $0.25 a turn: four turns start before the cap, the rest
    // are refused even though none has finished yet.
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        budget.beginTurn("session-a:chat", "session-a", "203.0.113.7"),
      ),
    );
    const started = results.filter((r) => r.denied === null);
    expect(started).toHaveLength(4);
    expect(started.every((r) => r.reservedMicroUsd === 250_000)).toBe(true);
    const codes = await Promise.all(
      results
        .filter((r) => r.denied !== null)
        .map(async (r) => (await r.denied!.json()).code),
    );
    expect(new Set(codes)).toEqual(new Set(["DAILY_BUDGET_EXCEEDED"]));
  });

  it("keeps the reservation as the charge for a turn that reports no usage", async () => {
    vi.stubEnv("XULUX_TURN_RESERVE_USD", "0.5");
    const budget = await loadBudget();
    // Two failed turns hold $0.50 each and reach the $1 cap.
    for (let i = 0; i < 2; i++) {
      const { denied } = await budget.beginTurn(
        "session-a:chat",
        "session-a",
        null,
      );
      expect(denied).toBeNull();
    }
    const { denied } = await budget.beginTurn(
      "session-a:chat",
      "session-a",
      null,
    );
    expect((await denied!.json()).code).toBe("DAILY_BUDGET_EXCEEDED");
  });

  it("replaces the reservation with the real cost when a turn finishes", async () => {
    vi.stubEnv("XULUX_TURN_RESERVE_USD", "0.5");
    const budget = await loadBudget();
    // Each finished turn costs about $0.0004, far below the reservation, so
    // many turns fit under the $1 cap once they are settled.
    for (let i = 0; i < 10; i++) {
      const turn = await budget.beginTurn(
        "session-a:chat",
        "session-a",
        "203.0.113.7",
      );
      expect(turn.denied).toBeNull();
      await budget.finishTurn(
        "session-a:chat",
        "session-a",
        { outputTokens: 1_000 },
        turn.budgetDate,
        "203.0.113.7",
        turn.reservedMicroUsd,
      );
    }
  });

  it("does not hold a reservation for a refused turn", async () => {
    vi.stubEnv("XULUX_TURN_RESERVE_USD", "0.5");
    vi.stubEnv("XULUX_MAX_TURNS_PER_CHAT", "1");
    const budget = await loadBudget();
    expect(
      (await budget.beginTurn("session-a:chat", "session-a", null)).denied,
    ).toBeNull();
    const refused = await budget.beginTurn("session-a:chat", "session-a", null);
    expect((await refused.denied!.json()).code).toBe("CHAT_TURN_LIMIT");
    // A new chat in the same session still has the other $0.50 of the day.
    expect(
      (await budget.beginTurn("session-a:chat-2", "session-a", null)).denied,
    ).toBeNull();
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
