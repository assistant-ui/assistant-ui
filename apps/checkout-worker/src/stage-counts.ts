import type { Checkout } from "setup-agent";

/**
 * Anonymous setup counts: how many setups reached each stage, per coding
 * agent kind and UTC day. The count is all that is kept. No setup, link,
 * user or project id, no address, folder, prompt or time finer than the day
 * reaches the counter, so a count cannot be traced back to a setup.
 */

/** The stages a setup passes through, in order. */
const FUNNEL = ["created", "planning", "installing", "done"] as const;

/** A stage a setup's count records; `cancelled` can follow any other. */
export type Stage = (typeof FUNNEL)[number] | "cancelled";

const STAGES: readonly string[] = [...FUNNEL, "cancelled"];

/** The kinds the CLI detects (setup-agent's CODING_AGENTS); any other is `other`. */
const AGENT_KINDS: readonly string[] = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "copilot",
  "amp",
  "opencode",
  "cline",
  "aider",
  "goose",
  "warp",
  "windsurf",
  "kiro",
  "junie",
  "qwen",
  "roo",
  "zed",
  "augment",
  "droid",
  "crush",
];

/** What a count records as the agent kind: a known kind, `other`, or `unknown` when the CLI reported none. */
export const agentKindLabel = (kind: string | null) =>
  kind === null ? "unknown" : AGENT_KINDS.includes(kind) ? kind : "other";

const isStage = (value: unknown): value is Stage =>
  typeof value === "string" && STAGES.includes(value);

const isAgentKindLabel = (value: unknown): value is string =>
  typeof value === "string" &&
  (value === "unknown" || value === "other" || AGENT_KINDS.includes(value));

/** The stages `state` has reached. A cancelled setup was created, and its other stages were counted as it reached them. */
const reached = (state: Checkout.State): Stage[] => {
  if (state.createdAt === null) return [];
  if (state.status === "cancelled") return ["created", "cancelled"];
  const index = FUNNEL.indexOf(
    state.status === "waiting" ? "created" : state.status,
  );
  return FUNNEL.slice(0, index + 1);
};

/**
 * Which stages of one setup still need counting. The first state it sees is
 * the one the object restored, whose stages were counted before (or before
 * counting began), so only stages reached after that count, each once.
 * The CLI names its agent kind right after it creates the setup, so stages
 * wait for that, and a closed setup counts what it reached without one.
 */
export const createStageTracker = () => {
  let counted: Set<Stage> | undefined;
  return (state: Checkout.State): Stage[] => {
    if (counted === undefined) {
      counted = new Set(reached(state));
      return [];
    }
    const introduced =
      state.agent.introducedAt !== null || state.agent.lastSeenAt !== null;
    if (!introduced && state.status !== "done" && state.status !== "cancelled")
      return [];
    const fresh = reached(state).filter((stage) => !counted!.has(stage));
    for (const stage of fresh) counted.add(stage);
    return fresh;
  };
};

/** The body the setup object sends the counter: the stages and the agent kind, nothing else. */
export type StageCountRequest = { stages: Stage[]; agentKind: string };

export const STATS_OBJECT_NAME = "all";
const STATS_URL = "https://setup-stats";
export const COUNT_URL = `${STATS_URL}/count`;
export const EXPORT_URL = `${STATS_URL}/export`;

export type StatsEnv = {
  /** The PostHog project key the setup app sends events with; without it counts are kept but not exported. */
  POSTHOG_API_KEY?: string;
};

const POSTHOG_BATCH_URL = "https://us.i.posthog.com/batch/";
/** One PostHog identity for every count, so no person profile is built from them. */
const POSTHOG_DISTINCT_ID = "setup-worker";

const COUNT_PREFIX = "count:";
const PENDING_PREFIX = "pending:";

/** The UTC day of `at`, as YYYY-MM-DD. */
const dayOf = (at: number) => new Date(at).toISOString().slice(0, 10);

type Storage = Pick<
  DurableObjectState["storage"],
  "get" | "put" | "delete" | "list"
>;

/**
 * The one object that keeps the counts, under `count:<day>:<stage>:<agent
 * kind>`, and marks each day it has not exported under `pending:<day>`.
 * Each hour (the worker's cron) it sends PostHog one `setup_stage_count`
 * event per count of each finished day, then drops the day's mark.
 */
export class SetupStatsDO {
  readonly #storage: Storage;
  readonly #env: StatsEnv;

  constructor(ctx: { storage: Storage }, env: StatsEnv) {
    this.#storage = ctx.storage;
    this.#env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    const url = new URL(request.url);
    if (url.href === COUNT_URL) return this.#count(request);
    if (url.href === EXPORT_URL) return Response.json(await this.#export());
    return new Response("Not found", { status: 404 });
  }

  async #count(request: Request) {
    const body = (await request.json().catch(() => null)) as Partial<
      Record<string, unknown>
    > | null;
    const stages = body?.stages;
    const agentKind = body?.agentKind;
    if (
      !Array.isArray(stages) ||
      stages.length === 0 ||
      !stages.every(isStage) ||
      !isAgentKindLabel(agentKind)
    )
      return new Response("invalid count", { status: 400 });
    const day = dayOf(Date.now());
    for (const stage of new Set(stages)) {
      const key = `${COUNT_PREFIX}${day}:${stage}:${agentKind}`;
      const count = (await this.#storage.get<number>(key)) ?? 0;
      await this.#storage.put(key, count + 1);
    }
    await this.#storage.put(`${PENDING_PREFIX}${day}`, 1);
    return new Response(null, { status: 204 });
  }

  /** Sends each finished day's counts that PostHog does not have yet. */
  async #export() {
    const apiKey = this.#env.POSTHOG_API_KEY;
    if (!apiKey) return { exported: [] as string[], skipped: "no key" };
    const today = dayOf(Date.now());
    const pending = await this.#storage.list({ prefix: PENDING_PREFIX });
    const exported: string[] = [];
    for (const key of pending.keys()) {
      const day = key.slice(PENDING_PREFIX.length);
      if (day >= today) continue;
      const counts = await this.#storage.list<number>({
        prefix: `${COUNT_PREFIX}${day}:`,
      });
      const batch = [...counts].map(([countKey, count]) => {
        const [stage, agentKind] = countKey
          .slice(`${COUNT_PREFIX}${day}:`.length)
          .split(":");
        return {
          event: "setup_stage_count",
          timestamp: `${day}T00:00:00.000Z`,
          properties: {
            distinct_id: POSTHOG_DISTINCT_ID,
            app: "setup",
            day,
            stage,
            agent_kind: agentKind,
            count,
            $process_person_profile: false,
            $geoip_disable: true,
          },
        };
      });
      if (batch.length > 0) {
        const response = await fetch(POSTHOG_BATCH_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, batch }),
        });
        // Left marked, the day goes out with the next run.
        if (!response.ok) break;
      }
      await this.#storage.delete(key);
      exported.push(day);
    }
    return { exported };
  }
}
