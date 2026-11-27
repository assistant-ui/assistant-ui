import { afterEach, describe, expect, it, vi } from "vitest";
import { initialCheckoutState, type Checkout } from "setup-agent";
import { CODING_AGENTS } from "setup-agent/cli";
import {
  COUNT_URL,
  EXPORT_URL,
  SetupStatsDO,
  agentKindLabel,
  createStageTracker,
} from "./stage-counts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const setup = (
  status: Checkout.Status,
  agent: Partial<Checkout.State["agent"]> = {},
): Checkout.State => {
  const state = initialCheckoutState();
  return {
    ...state,
    id: "setup-a",
    createdAt: 1,
    status,
    agent: { ...state.agent, ...agent },
  };
};
const introduced = { introducedAt: 2, kind: "claude" };

describe("stage tracker", () => {
  it("counts each stage once, from the moment the agent introduces itself", () => {
    const track = createStageTracker();
    expect(track(initialCheckoutState())).toEqual([]);
    expect(track(setup("waiting"))).toEqual([]);
    expect(track(setup("planning"))).toEqual([]);
    expect(track(setup("planning", introduced))).toEqual([
      "created",
      "planning",
    ]);
    expect(track(setup("planning", introduced))).toEqual([]);
    expect(track(setup("installing", introduced))).toEqual(["installing"]);
    expect(track(setup("done", introduced))).toEqual(["done"]);
    expect(track(setup("done", introduced))).toEqual([]);
  });

  it("counts only the stages reached after the state the object restored", () => {
    const track = createStageTracker();
    expect(track(setup("planning", introduced))).toEqual([]);
    expect(track(setup("installing", introduced))).toEqual(["installing"]);
  });

  it("counts a cancelled setup as created and cancelled, without its agent", () => {
    const track = createStageTracker();
    track(initialCheckoutState());
    expect(track(setup("cancelled"))).toEqual(["created", "cancelled"]);
  });

  it("counts a jump past a stage as reaching it", () => {
    const track = createStageTracker();
    track(initialCheckoutState());
    expect(track(setup("installing", introduced))).toEqual([
      "created",
      "planning",
      "installing",
    ]);
  });
});

describe("agent kind label", () => {
  it("keeps every kind the CLI detects and folds anything else into other", () => {
    for (const { kind } of CODING_AGENTS)
      expect(agentKindLabel(kind)).toBe(kind);
    expect(agentKindLabel("other")).toBe("other");
    expect(agentKindLabel("Jane's laptop")).toBe("other");
    expect(agentKindLabel(null)).toBe("unknown");
  });
});

const createStats = (env: { POSTHOG_API_KEY?: string } = {}) => {
  const stored = new Map<string, unknown>();
  const object = new SetupStatsDO(
    {
      storage: {
        get: async (key: string) => stored.get(key),
        put: async (key: string, value: unknown) => {
          stored.set(key, value);
        },
        delete: async (key: string) => stored.delete(key),
        list: async ({ prefix = "" }: { prefix?: string } = {}) =>
          new Map([...stored].filter(([key]) => key.startsWith(prefix)).sort()),
      } as unknown as DurableObjectStorage,
    },
    env,
  );
  const count = (body: unknown) =>
    object.fetch(
      new Request(COUNT_URL, { method: "POST", body: JSON.stringify(body) }),
    );
  const runExport = async () =>
    (await (
      await object.fetch(new Request(EXPORT_URL, { method: "POST" }))
    ).json()) as { exported: string[]; skipped?: string };
  return { stored, count, runExport };
};

describe("SetupStatsDO", () => {
  it("adds one to the day's count for each stage and agent kind", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-27T10:00:00Z"));
    const stats = createStats();
    expect(
      (
        await stats.count({
          stages: ["created", "planning"],
          agentKind: "codex",
        })
      ).status,
    ).toBe(204);
    await stats.count({ stages: ["created"], agentKind: "codex" });
    await stats.count({ stages: ["created"], agentKind: "unknown" });
    expect(Object.fromEntries(stats.stored)).toEqual({
      "count:2026-11-27:created:codex": 2,
      "count:2026-11-27:planning:codex": 1,
      "count:2026-11-27:created:unknown": 1,
      "pending:2026-11-27": 1,
    });
  });

  it("refuses anything but known stages and agent kinds, and stores nothing else it is sent", async () => {
    const stats = createStats();
    for (const body of [
      { stages: ["created"], agentKind: "Jane's laptop" },
      { stages: ["setup-a"], agentKind: "claude" },
      { stages: [], agentKind: "claude" },
      { stages: "created", agentKind: "claude" },
      null,
    ])
      expect((await stats.count(body)).status).toBe(400);
    await stats.count({
      stages: ["created"],
      agentKind: "claude",
      setupId: "setup-a",
      cwd: "/Users/jane/acme",
    });
    expect(stats.stored.size).toBe(2);
    const written = JSON.stringify([...stats.stored]);
    expect(written).not.toContain("setup-a");
    expect(written).not.toContain("jane");
  });

  it("keeps the counts without a PostHog key", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const stats = createStats();
    await stats.count({ stages: ["created"], agentKind: "claude" });
    expect(await stats.runExport()).toEqual({
      exported: [],
      skipped: "no key",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(stats.stored.size).toBe(2);
  });

  it("sends PostHog each finished day once, as counts with no identity", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) => new Response("{}"),
    );
    vi.stubGlobal("fetch", fetch);
    const stats = createStats({ POSTHOG_API_KEY: "phc_test" });
    vi.setSystemTime(new Date("2026-11-26T23:59:00Z"));
    await stats.count({ stages: ["created", "planning"], agentKind: "claude" });
    vi.setSystemTime(new Date("2026-11-27T00:30:00Z"));
    await stats.count({ stages: ["created"], agentKind: "cursor" });

    expect(await stats.runExport()).toEqual({ exported: ["2026-11-26"] });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://us.i.posthog.com/batch/");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      api_key: "phc_test",
      batch: [
        {
          event: "setup_stage_count",
          timestamp: "2026-11-26T00:00:00.000Z",
          properties: {
            distinct_id: "setup-worker",
            app: "setup",
            day: "2026-11-26",
            stage: "created",
            agent_kind: "claude",
            count: 1,
            $process_person_profile: false,
            $geoip_disable: true,
          },
        },
        {
          event: "setup_stage_count",
          timestamp: "2026-11-26T00:00:00.000Z",
          properties: {
            distinct_id: "setup-worker",
            app: "setup",
            day: "2026-11-26",
            stage: "planning",
            agent_kind: "claude",
            count: 1,
            $process_person_profile: false,
            $geoip_disable: true,
          },
        },
      ],
    });

    // Today is still counting, and a sent day is not sent again.
    expect(await stats.runExport()).toEqual({ exported: [] });
    expect(fetch).toHaveBeenCalledOnce();
    expect(stats.stored.has("pending:2026-11-27")).toBe(true);
    expect(stats.stored.get("count:2026-11-26:created:claude")).toBe(1);
  });

  it("keeps a day to send again when PostHog refuses it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetch = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const stats = createStats({ POSTHOG_API_KEY: "phc_test" });
    vi.setSystemTime(new Date("2026-11-26T12:00:00Z"));
    await stats.count({ stages: ["created"], agentKind: "claude" });
    vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
    expect(await stats.runExport()).toEqual({ exported: [] });
    expect(stats.stored.has("pending:2026-11-26")).toBe(true);
    fetch.mockResolvedValue(new Response("{}"));
    expect(await stats.runExport()).toEqual({ exported: ["2026-11-26"] });
  });
});
