import { CheckoutHost } from "setup-agent/host";
import { isClosed, isValidModelAnswer, type Checkout } from "setup-agent";
import { respondToGuideRequest } from "./guide";
import {
  ACTIVITY_WRITE_MS,
  EMPTY_ROOM_IDLE_MS,
  MAX_MESSAGE_BYTES,
  ROOM_IDLE_MS,
} from "./limits";
import {
  COUNT_URL,
  EXPORT_URL,
  STATS_OBJECT_NAME,
  agentKindLabel,
  createStageTracker,
  type StageCountRequest,
} from "./stage-counts";
import { resource, useResource } from "@assistant-ui/tap";
import {
  StatewireDurableObject,
  statewireHandlers,
  routeStatewireRequest,
} from "@statewire/cloudflare";

type Env = {
  CHECKOUT: StatewireDurableObject.Namespace;
  /** Per-client-IP budget for requests to links that hold no setup yet (wrangler.jsonc). */
  NEW_LINKS: RateLimit;
  /** The one object that keeps the anonymous stage counts (./stage-counts.ts). */
  SETUP_STATS: StatewireDurableObject.Namespace;
};

const statsObject = (env: Env) =>
  env.SETUP_STATS.get(env.SETUP_STATS.idFromName(STATS_OBJECT_NAME));

type SecretDeposit = {
  setupId: string;
  setupCreatedAt: number;
  inputId: string;
  inputCreatedAt: number;
  answer: string;
  secret: string;
  expiresAt: number;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Statewire-Client-Id, Statewire-Lease",
  "Access-Control-Expose-Headers": "Statewire-Lease",
};

const withCors = (response: Response) => {
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
};

const SECRET_PATH = /\/secret\/([^/]+)$/;
/** `/<link>/guide`: the CLI's texts and intro steps (./guide.ts), without the setup's state. */
const GUIDE_PATH = /^\/[^/]+\/guide$/;
const SECRET_TTL_MS = 60 * 60 * 1000;
const MAX_SECRET_BYTES = 16 * 1024;
/** The link alphabet and length the setup page accepts (apps/setup). */
const LINK_PATH = /^\/[A-Za-z0-9]{8,64}(?:\/|$)/;
const ACTIVITY_KEY = "room:lastActiveAt";

/** The body's bytes, or `undefined` once it passes `max` bytes, without reading further. */
const readCappedBytes = async (request: Request, max: number) => {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      return undefined;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

/** The body as text, or `undefined` once it passes `max` bytes. */
const readCapped = async (request: Request, max: number) => {
  const bytes = await readCappedBytes(request, max);
  return bytes === undefined ? undefined : new TextDecoder().decode(bytes);
};

export { SetupStatsDO } from "./stage-counts";

export class CheckoutDO extends StatewireDurableObject<Env>() {
  #state: Checkout.State | undefined;
  #cleanupScope = "";
  #lastActiveAt: number | undefined;
  #stagesToCount = createStageTracker();
  #countStarted = false;
  #countQueued = false;

  /** Whether the link holds a setup; until it does, it gets `EMPTY_ROOM_IDLE_MS`. */
  #hasSetup() {
    return this.#state !== undefined && this.#state.createdAt !== null;
  }

  #idleMs() {
    return this.#hasSetup() ? ROOM_IDLE_MS : EMPTY_ROOM_IDLE_MS;
  }

  /** Records activity and keeps an alarm set for the idle deadline. */
  #touch(force = false) {
    const now = Date.now();
    if (
      !force &&
      this.#lastActiveAt !== undefined &&
      now - this.#lastActiveAt < ACTIVITY_WRITE_MS
    )
      return;
    this.#lastActiveAt = now;
    const idleMs = this.#idleMs();
    this.ctx.waitUntil(
      this.ctx.blockConcurrencyWhile(async () => {
        await this.ctx.storage.put(ACTIVITY_KEY, now);
        await this.#armAlarm(now + idleMs);
      }),
    );
  }

  async #armAlarm(at: number) {
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm === null || alarm > at) await this.ctx.storage.setAlarm(at);
  }

  override async fetch(request: Request): Promise<Response> {
    // Anyone can open a link, so links without a setup are budgeted per
    // client before they store anything.
    if (!this.#hasSetup()) {
      const { success } = await this.env.NEW_LINKS.limit({
        key: request.headers.get("cf-connecting-ip") ?? "",
      });
      if (!success) return new Response("too many new links", { status: 429 });
    }
    this.#touch();
    if (
      request.method !== "GET" &&
      request.headers.get("upgrade")?.toLowerCase() !== "websocket"
    ) {
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > MAX_MESSAGE_BYTES)
        return new Response("request too large", { status: 413 });
      if (request.body && !SECRET_PATH.test(new URL(request.url).pathname)) {
        const body = await readCappedBytes(request, MAX_MESSAGE_BYTES);
        if (body === undefined)
          return new Response("request too large", { status: 413 });
        request = new Request(request, { body });
      }
    }
    return super.fetch(request);
  }

  override webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const size =
      typeof message === "string"
        ? new TextEncoder().encode(message).byteLength
        : message.byteLength;
    if (size > MAX_MESSAGE_BYTES) {
      ws.close(1009, "message too large");
      return;
    }
    this.#touch();
    super.webSocketMessage(ws, message);
  }

  override webSocketClose(ws: WebSocket) {
    this.#touch(true);
    super.webSocketClose(ws);
  }

  override webSocketError(ws: WebSocket) {
    this.#touch(true);
    super.webSocketError(ws);
  }

  override statewire = statewireHandlers(this.ctx, (restored) => {
    const instance = this;
    return resource(function useCheckoutTransport() {
      const host = useResource(CheckoutHost(restored));
      instance.#state = host.state;
      instance.#scheduleCleanup();
      instance.#countStages();
      return {
        ...host,
        subscribe: (listener: () => void) =>
          host.subscribe(() => {
            instance.#scheduleCleanup();
            instance.#countStages();
            listener();
          }),
      };
    })();
  });

  /**
   * Adds the stages this setup just reached to the anonymous counts: only
   * the stage names and the agent kind leave this object. The host reports
   * each field a command sets, so the restored state is read at once and a
   * change once the command has finished (`agent/intro` sets the intro time
   * before the kind).
   */
  #countStages() {
    if (this.#countQueued) return;
    if (!this.#countStarted) {
      if (!this.#state) return;
      this.#countStarted = true;
      this.#stagesToCount(this.#state);
      return;
    }
    this.#countQueued = true;
    queueMicrotask(() => {
      this.#countQueued = false;
      const state = this.#state;
      if (!state) return;
      const stages = this.#stagesToCount(state);
      if (stages.length === 0) return;
      const body: StageCountRequest = {
        stages,
        agentKind: agentKindLabel(state.agent.kind),
      };
      this.ctx.waitUntil(
        Promise.resolve()
          .then(() =>
            statsObject(this.env).fetch(
              new Request(COUNT_URL, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
              }),
            ),
          )
          .catch(() => {
            // A count that fails is dropped; the setup goes on.
          }),
      );
    });
  }

  #currentInput(setupId: string, inputId: string) {
    const state = this.#state;
    if (
      !state ||
      state.createdAt === null ||
      state.id !== setupId ||
      isClosed(state)
    )
      return undefined;
    return state.inputs.find(
      (input) => input.id === inputId && input.kind === "model",
    );
  }

  #isCurrentDeposit(value: unknown): value is SecretDeposit {
    if (typeof value !== "object" || value === null) return false;
    const deposit = value as Partial<SecretDeposit>;
    if (
      typeof deposit.setupId !== "string" ||
      typeof deposit.inputId !== "string" ||
      typeof deposit.answer !== "string" ||
      typeof deposit.secret !== "string" ||
      typeof deposit.expiresAt !== "number"
    )
      return false;
    const input = this.#currentInput(deposit.setupId, deposit.inputId);
    return (
      input !== undefined &&
      deposit.setupCreatedAt === this.#state?.createdAt &&
      deposit.inputCreatedAt === input.createdAt &&
      deposit.expiresAt > Date.now() &&
      isValidModelAnswer(input, deposit.answer) &&
      (input.status === "open" ||
        (input.status === "answered" && input.answer === deposit.answer))
    );
  }

  #scheduleCleanup() {
    const state = this.#state;
    if (!state) return;
    const scope = JSON.stringify([
      state.id,
      state.createdAt,
      state.status,
      state.inputs.map((input) => [input.id, input.status, input.answer]),
    ]);
    if (scope === this.#cleanupScope) return;
    this.#cleanupScope = scope;
    this.ctx.waitUntil(
      this.ctx.blockConcurrencyWhile(async () => {
        const secrets = await this.ctx.storage.list({ prefix: "secret:" });
        for (const [key, value] of secrets) {
          if (!this.#isCurrentDeposit(value))
            await this.ctx.storage.delete(key);
        }
      }),
    );
  }

  async alarm() {
    await this.ctx.blockConcurrencyWhile(async () => {
      const now = Date.now();
      let lastActiveAt = await this.ctx.storage.get<number>(ACTIVITY_KEY);
      // A setup stored before activity was recorded starts its idle clock now.
      if (lastActiveAt === undefined) {
        // An empty object (a deleted setup's alarm running again) stays empty.
        if ((await this.ctx.storage.list({ limit: 1 })).size === 0) return;
        lastActiveAt = now;
        await this.ctx.storage.put(ACTIVITY_KEY, now);
      }
      const idleMs = this.#idleMs();
      if (now - lastActiveAt >= idleMs) {
        // Every live agent and setup page sends heartbeats, which count as
        // activity, so a socket silent this long holds nothing open.
        for (const ws of this.ctx.getWebSockets()) {
          try {
            ws.close(1000, "idle setup deleted");
          } catch {
            // Already closed.
          }
        }
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
        // Drop the in-memory setup too, so the link starts empty if reused.
        this.ctx.abort("idle setup deleted", { retryAlarm: false });
        return;
      }
      let next = lastActiveAt + idleMs;
      const secrets = await this.ctx.storage.list({ prefix: "secret:" });
      for (const [key, value] of secrets) {
        const expiresAt = (value as Partial<SecretDeposit> | undefined)
          ?.expiresAt;
        if (typeof expiresAt !== "number" || expiresAt <= now) {
          await this.ctx.storage.delete(key);
        } else if (expiresAt < next) {
          next = expiresAt;
        }
      }
      await this.ctx.storage.setAlarm(next);
    });
  }

  override async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const match = SECRET_PATH.exec(url.pathname);
    if (match === null) return super.onRequest(request);
    if (request.method !== "PUT" && request.method !== "GET") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, PUT" },
      });
    }
    const setupId = url.searchParams.get("setup");
    if (!setupId) return new Response("setup ID required", { status: 400 });
    let inputId: string;
    try {
      inputId = decodeURIComponent(match[1]!);
    } catch {
      return new Response("invalid input ID", { status: 400 });
    }
    const secret =
      request.method === "PUT"
        ? await readCapped(request, MAX_SECRET_BYTES)
        : "";
    if (secret === undefined) {
      return new Response("secret too large", { status: 413 });
    }
    return this.ctx.blockConcurrencyWhile(async () => {
      const input = this.#currentInput(setupId, inputId);
      if (!input) return new Response("no model input", { status: 404 });
      const key = `secret:${JSON.stringify([setupId, inputId])}`;
      if (request.method === "PUT") {
        if (input.status !== "open")
          return new Response("input closed", { status: 409 });
        if (input.redeemKeyHash === undefined)
          return new Response("redeem key required", { status: 409 });
        const answer = url.searchParams.get("answer");
        if (answer === null || !isValidModelAnswer(input, answer)) {
          return new Response("invalid deposit", { status: 400 });
        }
        if (secret === "") return new Response("empty secret", { status: 400 });
        const expiresAt = Date.now() + SECRET_TTL_MS;
        await this.ctx.storage.put(key, {
          setupId,
          setupCreatedAt: this.#state!.createdAt!,
          inputId,
          inputCreatedAt: input.createdAt,
          secret,
          answer,
          expiresAt,
        } satisfies SecretDeposit);
        await this.#armAlarm(expiresAt);
        return new Response(null, { status: 204 });
      }
      if (
        input.status !== "answered" ||
        !isValidModelAnswer(input, input.answer ?? "")
      )
        return new Response("no secret", { status: 404 });
      const value = await this.ctx.storage.get(key);
      if (!this.#isCurrentDeposit(value)) {
        await this.ctx.storage.delete(key);
        return new Response("no secret", { status: 404 });
      }
      // A model input without a redeem key hash never had a deposit
      // accepted here, so its key is never served.
      if (input.redeemKeyHash === undefined) {
        return new Response("invalid redeem key", { status: 403 });
      }
      const redeemKey = request.headers.get("Setup-Agent-Redeem-Key");
      const digest = new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(redeemKey ?? ""),
        ),
      );
      let difference = 0;
      for (let i = 0; i < digest.length; i++) {
        difference |=
          digest[i]! ^
          Number.parseInt(input.redeemKeyHash.slice(i * 2, i * 2 + 2), 16);
      }
      if (redeemKey === null || difference !== 0) {
        return new Response("invalid redeem key", { status: 403 });
      }
      await this.ctx.storage.delete(key);
      return new Response(value.secret, {
        headers: { "content-type": "text/plain" },
      });
    });
  }
}

/**
 * Compatibility window: people run CLIs that are days or weeks old (pnpm's
 * 24h minimum release age, team gates of 3–7 days), so this worker and the
 * setup app keep every route, command and state field that `assistant-ui`
 * and `setup-agent` versions from the last two weeks use. Changes are
 * additive only, and this worker deploys before a CLI that relies on them
 * is published. Routes: `/<link>` (statewire, HTTP and WebSocket) and
 * `/<link>/secret/<input>` (model key deposits), and `/<link>/guide` (the
 * CLI's wording, by guide protocol version). Browser presence
 * (`browser/heartbeat`, `browser/bye`, `state.browser`) is additive; CLIs
 * that predate it ignore it, and newer CLIs fall back when it is missing.
 * Model key deposits need the input's redeem key hash, which every CLI
 * since setup-agent 0.0.7 sends. Links match the setup page's
 * alphabet, and a setup idle for `ROOM_IDLE_MS` is deleted, closing any
 * silent socket. A link with no setup is deleted after
 * `EMPTY_ROOM_IDLE_MS`, and requests to such links are rate limited per
 * client IP (`NEW_LINKS`). A setup whose
 * agent stream has been silent for the host's `AGENT_ABANDON_MS`, while
 * its setup page stayed awake, ends as cancelled. Each setup adds the
 * stages it reaches to anonymous per-day counts (`SetupStatsDO`), which
 * the hourly cron sends PostHog once each day is over.
 */
export default {
  scheduled: (
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) => {
    ctx.waitUntil(
      Promise.resolve(
        statsObject(env).fetch(new Request(EXPORT_URL, { method: "POST" })),
      ),
    );
  },
  fetch: async (request: Request, env: Env) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    if (!LINK_PATH.test(url.pathname)) {
      return withCors(new Response("Not found", { status: 404 }));
    }
    if (request.method === "GET" && GUIDE_PATH.test(url.pathname)) {
      const { status, body } = respondToGuideRequest(url.searchParams);
      return Response.json(body, {
        status,
        headers: { "cache-control": "no-store", ...CORS_HEADERS },
      });
    }
    url.pathname = `/checkout${url.pathname}`;
    const response = await routeStatewireRequest(
      new Request(url, request),
      env,
    );
    return withCors(response ?? new Response("Not found", { status: 404 }));
  },
};
