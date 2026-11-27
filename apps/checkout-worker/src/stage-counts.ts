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
type Stage = (typeof FUNNEL)[number] | "cancelled";

const STAGES: readonly Stage[] = [...FUNNEL, "cancelled"];

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
  typeof value === "string" && (STAGES as readonly string[]).includes(value);

const isAgentKindLabel = (value: unknown): value is string =>
  typeof value === "string" &&
  (value === "unknown" || value === "other" || AGENT_KINDS.includes(value));

/** The stages `state` shows it has reached. A cancelled setup shows only that it was created; the tracker remembers the rest. */
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
 * counting began) once its agent had introduced itself, so only stages
 * reached after that count, each once.
 * The CLI names its agent kind right after it creates the setup, so stages
 * it reaches before then wait for that, and a closed setup counts every
 * stage it reached without one. `release` hands back stages whose count
 * failed, so the next change sends them again.
 */
export const createStageTracker = () => {
  let counted: Set<Stage> | undefined;
  const seen = new Set<Stage>();
  const track = (state: Checkout.State): Stage[] => {
    const introduced =
      state.agent.introducedAt !== null || state.agent.lastSeenAt !== null;
    const open = state.status !== "done" && state.status !== "cancelled";
    if (counted === undefined) {
      // An open setup whose agent has not introduced itself has counted
      // nothing yet, so its stages still wait for the introduction.
      if (open && !introduced) {
        counted = new Set();
        for (const stage of reached(state)) seen.add(stage);
      } else counted = new Set(reached(state));
      return [];
    }
    for (const stage of reached(state)) seen.add(stage);
    if (open && !introduced) return [];
    const fresh = STAGES.filter(
      (stage) => seen.has(stage) && !counted!.has(stage),
    );
    for (const stage of fresh) counted.add(stage);
    return fresh;
  };
  const release = (stages: readonly Stage[]) => {
    for (const stage of stages) counted?.delete(stage);
  };
  return { track, release };
};

/** The body the setup object sends the counter: the stages and the agent kind, nothing else. */
export type StageCountRequest = { stages: Stage[]; agentKind: string };

export const STATS_OBJECT_NAME = "all";
const STATS_URL = "https://setup-stats";
export const COUNT_URL = `${STATS_URL}/count`;
export const EXPORT_URL = `${STATS_URL}/export`;

type StatsEnv = {
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

/** A UUID (version 8) derived from the count's day, stage and agent kind alone. */
const countUuid = async (day: string, stage: string, agentKind: string) => {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `setup_stage_count:${day}:${stage}:${agentKind}`,
      ),
    ),
  );
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10, 16),
  ]
    .map((group) => group.join(""))
    .join("-");
};

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
      const batch = await Promise.all(
        [...counts].map(async ([countKey, count]) => {
          const [stage, agentKind] = countKey
            .slice(`${COUNT_PREFIX}${day}:`.length)
            .split(":");
          return {
            event: "setup_stage_count",
            // The same for every send of this count, so PostHog keeps one
            // copy if a day goes out twice (a restart before its mark is dropped).
            uuid: await countUuid(day, stage!, agentKind!),
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
        }),
      );
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
