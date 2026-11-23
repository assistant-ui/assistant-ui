import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import worker, { CheckoutDO, MAX_MESSAGE_BYTES, ROOM_IDLE_MS } from "./index";
import { StatewireClient, StatewireHttp } from "statewire";
import { initialCheckoutState, type Checkout } from "setup-agent";

const instances: CheckoutDO[] = [];
const clients: StatewireClient<
  Checkout.State | undefined,
  Checkout.Commands
>[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) client.dispose();
  for (const instance of instances.splice(0)) instance.statewire.dispose();
});

const createInstance = (snapshot?: Checkout.State) => {
  const stored = new Map<string, unknown>(
    snapshot === undefined ? [] : [["statewire:snapshot", snapshot]],
  );
  const pending: Promise<unknown>[] = [];
  const alarm = { at: null as number | null };
  const sockets: unknown[] = [];
  let gate: Promise<unknown> = Promise.resolve();
  const context = {
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise);
    },
    acceptWebSocket: vi.fn(),
    getWebSockets: () => sockets,
    abort: vi.fn(),
    storage: {
      get: async (key: string) => stored.get(key),
      put: async (key: string, value: unknown) => {
        stored.set(key, value);
      },
      delete: async (key: string) => stored.delete(key),
      deleteAll: async () => {
        stored.clear();
      },
      list: async ({
        prefix = "",
        limit,
      }: {
        prefix?: string;
        limit?: number;
      }) =>
        new Map(
          [...stored].filter(([key]) => key.startsWith(prefix)).slice(0, limit),
        ),
      getAlarm: async () => alarm.at,
      setAlarm: async (at: number) => {
        alarm.at = at;
      },
      deleteAlarm: async () => {
        alarm.at = null;
      },
    },
    blockConcurrencyWhile: <T>(callback: () => Promise<T>) => {
      const promise = gate.then(callback);
      gate = promise.catch(() => {});
      pending.push(promise);
      return promise;
    },
  };
  const instance = new CheckoutDO(
    context as unknown as ConstructorParameters<typeof CheckoutDO>[0],
    {
      CHECKOUT: {
        idFromName: (name) => name,
        get: () => ({ fetch: () => new Response(null, { status: 404 }) }),
      },
    },
  );
  instances.push(instance);
  return {
    instance,
    context,
    stored,
    alarm,
    sockets,
    ready: () => Promise.all(pending),
  };
};

const request = (path: string, method = "GET", body?: string) =>
  new Request(`https://checkout.test/session1/${path}`, {
    method,
    ...(body === undefined ? {} : { body }),
  });

/** SHA-256 of "redeem-key". */
const REDEEM_KEY_HASH =
  "3389fd9e8dac282ba9df440375f67fbe84dcd70f157d4adabbdd2fd56c7a8f08";
const modelAnswer = JSON.stringify({ provider: "openai", model: "gpt-5" });
const modelState = (id = "setup-a"): Checkout.State => ({
  ...initialCheckoutState(),
  id,
  status: "planning",
  createdAt: 1,
  inputs: [
    {
      id: "q1",
      kind: "model",
      phase: "planning",
      prompt: "Provider?",
      options: [{ id: "openai", label: "OpenAI" }],
      optional: false,
      status: "open",
      createdAt: 2,
      redeemKeyHash: REDEEM_KEY_HASH,
    },
  ],
});
const connect = async (fixture: ReturnType<typeof createInstance>) => {
  await fixture.ready();
  const client = new StatewireClient<
    Checkout.State | undefined,
    Checkout.Commands
  >({
    transport: StatewireHttp({
      url: "https://checkout.test/session",
      fetch: async (input, init) => {
        await fixture.ready();
        return fixture.instance.fetch(new Request(input, init));
      },
    }),
  });
  clients.push(client);
  await vi.waitFor(() => expect(client.state).toBeDefined());
  return client;
};
const secretRequest = (
  setup = "setup-a",
  method = "GET",
  secret?: string,
  answer = modelAnswer,
) => {
  const req = request(
    `secret/q1?setup=${encodeURIComponent(setup)}${secret === undefined ? "" : `&answer=${encodeURIComponent(answer)}`}`,
    method,
    secret,
  );
  if (method === "GET") req.headers.set("Setup-Agent-Redeem-Key", "redeem-key");
  return req;
};

describe("secret lifecycle", () => {
  it("tracks the setup page's presence and keeps a snapshot from before it working", async () => {
    // A snapshot an older worker stored has no browser field.
    const { browser: _, ...old } = modelState();
    const fixture = createInstance(old as Checkout.State);
    const client = await connect(fixture);
    expect(client.state?.browser).toEqual({
      lastSeenAt: null,
      connected: false,
    });
    await client.commands["browser/heartbeat"]();
    await vi.waitFor(() =>
      expect(client.state?.browser).toEqual({
        connected: true,
        lastSeenAt: expect.any(Number),
        awakeSince: expect.any(Number),
      }),
    );
    // Commands every released CLI sends keep working beside it.
    await client.commands["agent/hello"]({ cwd: "/app" });
    await client.commands["agent/heartbeat"]();
    await client.commands["browser/bye"]();
    await vi.waitFor(() =>
      expect(client.state?.browser?.connected).toBe(false),
    );
    expect(client.state?.agent.connected).toBe(true);
  });

  it("does not reuse an unclaimed key after replacing a setup and reusing q1", async () => {
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "old-key")))
        .status,
    ).toBe(204);
    await client.commands["checkout/create"]({ id: "setup-b", products: [] });
    await client.commands["checkout/begin-plan"]();
    const { inputId } = await client.commands["agent/ask"]({
      kind: "model",
      prompt: "Provider?",
      options: [{ id: "openai", label: "OpenAI" }],
      redeemKeyHash: REDEEM_KEY_HASH,
    });
    expect(inputId).toBe("q1");
    await client.commands["checkout/answer"]({ inputId, answer: modelAnswer });
    expect(
      (await fixture.instance.fetch(secretRequest("setup-b"))).status,
    ).toBe(404);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a"))).status,
    ).toBe(404);
    await fixture.ready();
    expect(
      [...fixture.stored.values()].some((value) =>
        JSON.stringify(value).includes("old-key"),
      ),
    ).toBe(false);
  });
});

describe("CheckoutDO", () => {
  it("requires the model input's redeem key without consuming a deposit on failure", async () => {
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    expect(
      (
        await fixture.instance.fetch(
          secretRequest("setup-a", "PUT", "provider-key"),
        )
      ).status,
    ).toBe(204);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: modelAnswer,
    });
    const withoutKey = secretRequest();
    withoutKey.headers.delete("Setup-Agent-Redeem-Key");
    expect((await fixture.instance.fetch(withoutKey)).status).toBe(403);
    expect(
      (
        await fixture.instance.fetch(
          new Request(secretRequest(), {
            headers: { "Setup-Agent-Redeem-Key": "wrong" },
          }),
        )
      ).status,
    ).toBe(403);
    expect(fixture.stored.get('secret:["setup-a","q1"]')).toEqual(
      expect.objectContaining({ secret: "provider-key" }),
    );
    const response = await fixture.instance.fetch(
      new Request(secretRequest(), {
        headers: { "Setup-Agent-Redeem-Key": "redeem-key" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("provider-key");
    expect(fixture.stored.has('secret:["setup-a","q1"]')).toBe(false);
  });

  it("keeps a key outside state and consumes it once only after its matching answer", async () => {
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    const put = await fixture.instance.fetch(
      secretRequest("setup-a", "PUT", "test-key"),
    );
    expect(put.status).toBe(204);
    const key = 'secret:["setup-a","q1"]';
    expect(fixture.stored.get(key)).toEqual(
      expect.objectContaining({
        setupId: "setup-a",
        inputId: "q1",
        secret: "test-key",
        answer: modelAnswer,
      }),
    );
    expect(JSON.stringify(client.state)).not.toContain("test-key");
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: modelAnswer,
    });
    const get = await fixture.instance.fetch(secretRequest());
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("test-key");
    expect(fixture.stored.has(key)).toBe(false);
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
  });

  it("requires a matching setup and current open model input for deposits", async () => {
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(request("secret/q1", "PUT", "key"))).status,
    ).toBe(400);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-other", "PUT", "key")))
        .status,
    ).toBe(404);
    expect(
      (
        await fixture.instance.fetch(
          request("secret/q2?setup=setup-a", "PUT", "key"),
        )
      ).status,
    ).toBe(404);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "")))
        .status,
    ).toBe(400);
    expect(
      (
        await fixture.instance.fetch(
          secretRequest("setup-a", "PUT", "key", "not JSON"),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await fixture.instance.fetch(
          secretRequest(
            "setup-a",
            "PUT",
            "key",
            JSON.stringify({ provider: "other", model: "model" }),
          ),
        )
      ).status,
    ).toBe(400);
    await client.commands["checkout/dismiss"]({ inputId: "q1" });
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
        .status,
    ).toBe(409);
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "POST"))).status,
    ).toBe(405);
  });

  it("rejects text inputs even when their answer looks like a model answer", async () => {
    const snapshot = modelState();
    snapshot.inputs[0]!.kind = "text";
    const fixture = createInstance(snapshot);
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
        .status,
    ).toBe(404);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: modelAnswer,
    });
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
  });

  it("does not serve a key if the user answers with a different model", async () => {
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
        .status,
    ).toBe(204);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: JSON.stringify({ provider: "openai", model: "other-model" }),
    });
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
    await fixture.ready();
    expect(
      [...fixture.stored.keys()].some((key) => key.startsWith("secret:")),
    ).toBe(false);
  });

  it.each(["cancel", "finish"])(
    "clears unused keys when the setup closes with %s",
    async (action) => {
      const fixture = createInstance(modelState());
      const client = await connect(fixture);
      expect(
        (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
          .status,
      ).toBe(204);
      if (action === "finish") {
        await client.commands["agent/plan"]({ markdown: "Install" });
        await client.commands["checkout/plan"]({ decision: "approve" });
        await client.commands["agent/done"]();
        await client.commands["checkout/finish"]();
      } else await client.commands["checkout/cancel"]();
      await fixture.ready();
      expect(
        [...fixture.stored.keys()].some((key) => key.startsWith("secret:")),
      ).toBe(false);
      expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
    },
  );

  it("expires unused deposits and never serves legacy unscoped storage", async () => {
    const snapshot = modelState();
    snapshot.inputs[0] = {
      ...snapshot.inputs[0]!,
      status: "answered",
      answer: modelAnswer,
    };
    const fixture = createInstance(snapshot);
    fixture.stored.set("secret:q1", "legacy-key");
    fixture.stored.set('secret:["setup-a","q1"]', {
      setupId: "setup-a",
      setupCreatedAt: 1,
      inputId: "q1",
      inputCreatedAt: 2,
      secret: "expired-key",
      answer: modelAnswer,
      expiresAt: Date.now() - 1,
    });
    await connect(fixture);
    await fixture.ready();
    expect(
      [...fixture.stored.keys()].some((key) => key.startsWith("secret:")),
    ).toBe(false);
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
  });

  it("consumes a deposited key at most once under concurrent retrieval", async () => {
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
        .status,
    ).toBe(204);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: modelAnswer,
    });
    const replies = await Promise.all([
      fixture.instance.fetch(secretRequest()),
      fixture.instance.fetch(secretRequest()),
    ]);
    expect(replies.map((reply) => reply.status).sort()).toEqual([200, 404]);
  });

  it("decodes input identifiers while rejecting malformed encoding", async () => {
    const snapshot = modelState();
    snapshot.inputs[0]!.id = "q 1";
    const fixture = createInstance(snapshot);
    const client = await connect(fixture);
    expect(
      (
        await fixture.instance.fetch(
          request(
            `secret/q%201?setup=setup-a&answer=${encodeURIComponent(modelAnswer)}`,
            "PUT",
            "key",
          ),
        )
      ).status,
    ).toBe(204);
    await client.commands["checkout/answer"]({
      inputId: "q 1",
      answer: modelAnswer,
    });
    expect(
      await (
        await fixture.instance.fetch(
          new Request(request("secret/q%201?setup=setup-a"), {
            headers: { "Setup-Agent-Redeem-Key": "redeem-key" },
          }),
        )
      ).text(),
    ).toBe("key");
    expect(
      (await fixture.instance.fetch(request("secret/%ZZ?setup=setup-a")))
        .status,
    ).toBe(400);
  });
});

describe("deposits", () => {
  it("reads a deposit's body before blocking other requests", async () => {
    const fixture = createInstance(modelState());
    await connect(fixture);
    let finish = () => {};
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(new TextEncoder().encode("slow-"));
        finish = () => {
          controller.enqueue(new TextEncoder().encode("key"));
          controller.close();
        };
      },
    });
    const put = fixture.instance.fetch(
      new Request(
        `https://checkout.test/session/secret/q1?setup=setup-a&answer=${encodeURIComponent(modelAnswer)}`,
        { method: "PUT", body, duplex: "half" } as RequestInit,
      ),
    );
    expect((await fixture.instance.fetch(secretRequest())).status).toBe(404);
    finish();
    expect((await put).status).toBe(204);
    expect(fixture.stored.get('secret:["setup-a","q1"]')).toEqual(
      expect.objectContaining({ secret: "slow-key" }),
    );
  });

  it("stops reading a deposit once it passes the size cap", async () => {
    const fixture = createInstance(modelState());
    await connect(fixture);
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(new Uint8Array(16 * 1024 + 1));
      },
    });
    const put = await fixture.instance.fetch(
      new Request(
        `https://checkout.test/session/secret/q1?setup=setup-a&answer=${encodeURIComponent(modelAnswer)}`,
        { method: "PUT", body, duplex: "half" } as RequestInit,
      ),
    );
    expect(put.status).toBe(413);
  });

  it("answers 413 even when cancelling the oversized body fails", async () => {
    const fixture = createInstance(modelState());
    await connect(fixture);
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(new Uint8Array(16 * 1024 + 1));
      },
      cancel: () => Promise.reject(new Error("cancel failed")),
    });
    const put = await fixture.instance.fetch(
      new Request(
        `https://checkout.test/session/secret/q1?setup=setup-a&answer=${encodeURIComponent(modelAnswer)}`,
        { method: "PUT", body, duplex: "half" } as RequestInit,
      ),
    );
    expect(put.status).toBe(413);
  });

  it("keeps a deposit's expiry alarm when an activity write overlaps it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    await connect(fixture);
    await fixture.ready();
    // A setup with no alarm pending, whose activity is due to be rewritten.
    fixture.alarm.at = null;
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    const { getAlarm } = fixture.context.storage;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    fixture.context.storage.getAlarm = async () => {
      const at = await getAlarm();
      if (calls++ === 0) await held;
      return at;
    };

    const deposit = fixture.instance.fetch(
      secretRequest("setup-a", "PUT", "key"),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    release();
    expect((await deposit).status).toBe(204);
    await fixture.ready();
    const { expiresAt } = fixture.stored.get('secret:["setup-a","q1"]') as {
      expiresAt: number;
    };
    expect(fixture.alarm.at).toBe(expiresAt);
  });

  it("refuses an oversized key", async () => {
    const fixture = createInstance(modelState());
    await connect(fixture);
    expect(
      (
        await fixture.instance.fetch(
          secretRequest("setup-a", "PUT", "k".repeat(16 * 1024 + 1)),
        )
      ).status,
    ).toBe(413);
  });

  it("deletes an unclaimed key at its expiry while the setup sits idle", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
        .status,
    ).toBe(204);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: modelAnswer,
    });
    await fixture.ready();
    const key = 'secret:["setup-a","q1"]';
    const { expiresAt } = fixture.stored.get(key) as { expiresAt: number };
    expect(fixture.alarm.at).toBe(expiresAt);
    vi.setSystemTime(expiresAt);
    fixture.alarm.at = null;
    await fixture.instance.alarm();
    expect(fixture.stored.has(key)).toBe(false);
    // Only the setup's idle deadline is left.
    expect(fixture.alarm.at).toBe(
      (fixture.stored.get("room:lastActiveAt") as number) + ROOM_IDLE_MS,
    );
  });
});

describe("worker routing", () => {
  it("answers CORS preflight without addressing a durable object", async () => {
    const idFromName = vi.fn((name: string) => name);
    const response = await worker.fetch(request("stream", "OPTIONS"), {
      CHECKOUT: { idFromName, get: vi.fn() },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Statewire-Client-Id, Statewire-Lease",
    );
    expect(idFromName).not.toHaveBeenCalled();
  });

  it("routes the browser session to CHECKOUT and retains lease headers", async () => {
    const fetch = vi.fn(
      (_request: Request) =>
        new Response("state", {
          status: 200,
          headers: { "Statewire-Lease": "lease-1" },
        }),
    );
    const idFromName = vi.fn((name: string) => name);
    const get = vi.fn(() => ({ fetch }));
    const response = await worker.fetch(request("stream"), {
      CHECKOUT: { idFromName, get },
    });
    expect(idFromName).toHaveBeenCalledWith("session1");
    expect(get).toHaveBeenCalledWith("session1");
    expect(fetch.mock.calls[0]?.[0]?.url).toBe(
      "https://checkout.test/checkout/session1/stream",
    );
    expect(await response.text()).toBe("state");
    expect(response.headers.get("Statewire-Lease")).toBe("lease-1");
    expect(response.headers.get("Access-Control-Expose-Headers")).toBe(
      "Statewire-Lease",
    );
  });
});

describe("limits", () => {
  it("refuses deposits and redemption for a model input without a redeem key", async () => {
    const snapshot = modelState();
    delete snapshot.inputs[0]!.redeemKeyHash;
    const fixture = createInstance(snapshot);
    const client = await connect(fixture);
    expect(
      (await fixture.instance.fetch(secretRequest("setup-a", "PUT", "key")))
        .status,
    ).toBe(409);
    await client.commands["checkout/answer"]({
      inputId: "q1",
      answer: modelAnswer,
    });
    // A deposit an older worker accepted is not served either.
    fixture.stored.set('secret:["setup-a","q1"]', {
      setupId: "setup-a",
      setupCreatedAt: 1,
      inputId: "q1",
      inputCreatedAt: 2,
      answer: modelAnswer,
      secret: "old-key",
      expiresAt: Date.now() + 60_000,
    });
    const response = await fixture.instance.fetch(secretRequest());
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("old-key");
  });

  it("deletes a setup once it has been idle for a day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    await connect(fixture);
    await fixture.ready();
    const lastActiveAt = fixture.stored.get("room:lastActiveAt") as number;
    expect(fixture.alarm.at).toBe(lastActiveAt + ROOM_IDLE_MS);

    vi.setSystemTime(lastActiveAt + ROOM_IDLE_MS - 1);
    await fixture.instance.alarm();
    expect(fixture.stored.size).toBeGreaterThan(0);
    expect(fixture.alarm.at).toBe(lastActiveAt + ROOM_IDLE_MS);

    vi.setSystemTime(lastActiveAt + ROOM_IDLE_MS);
    fixture.sockets.push({});
    await fixture.instance.alarm();
    expect(fixture.stored.size).toBeGreaterThan(0);
    expect(fixture.context.abort).not.toHaveBeenCalled();

    fixture.sockets.length = 0;
    await fixture.instance.alarm();
    expect(fixture.stored.size).toBe(0);
    expect(fixture.alarm.at).toBeNull();
    expect(fixture.context.abort).toHaveBeenCalledExactlyOnceWith(
      "idle setup deleted",
      { retryAlarm: false },
    );

    // Alarms run at least once, so the deleted setup's alarm can run again.
    await fixture.instance.alarm();
    expect(fixture.stored.size).toBe(0);
    expect(fixture.alarm.at).toBeNull();
  });

  it("starts the idle clock when the last socket closes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    await connect(fixture);
    await fixture.ready();
    const start = fixture.stored.get("room:lastActiveAt") as number;
    const ws = {};
    fixture.sockets.push(ws);

    vi.setSystemTime(start + ROOM_IDLE_MS);
    await fixture.instance.alarm();
    expect(fixture.alarm.at).toBe(start + 2 * ROOM_IDLE_MS);

    const closedAt = start + 2 * ROOM_IDLE_MS - 60_000;
    vi.setSystemTime(closedAt);
    fixture.sockets.length = 0;
    fixture.instance.webSocketClose(ws as WebSocket);
    await fixture.ready();

    vi.setSystemTime(start + 2 * ROOM_IDLE_MS);
    await fixture.instance.alarm();
    expect(fixture.stored.has("statewire:snapshot")).toBe(true);
    expect(fixture.context.abort).not.toHaveBeenCalled();
    expect(fixture.alarm.at).toBe(closedAt + ROOM_IDLE_MS);
  });

  it("keeps a setup for a full day after a request the throttle did not record", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    await connect(fixture);
    await fixture.ready();
    const start = fixture.stored.get("room:lastActiveAt") as number;

    const lastRequestAt = start + 59 * 60 * 1000;
    vi.setSystemTime(lastRequestAt);
    await fixture.instance.fetch(request("stream"));
    await fixture.ready();
    expect(fixture.stored.get("room:lastActiveAt")).toBe(start);

    vi.setSystemTime(lastRequestAt + 24 * 60 * 60 * 1000 - 1);
    await fixture.instance.alarm();
    expect(fixture.stored.has("statewire:snapshot")).toBe(true);
    expect(fixture.context.abort).not.toHaveBeenCalled();

    vi.setSystemTime(start + ROOM_IDLE_MS);
    await fixture.instance.alarm();
    expect(fixture.stored.size).toBe(0);
  });

  it("starts the idle clock when the last socket errors", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    await connect(fixture);
    await fixture.ready();
    const start = fixture.stored.get("room:lastActiveAt") as number;
    const ws = {};
    fixture.sockets.push(ws);

    const erroredAt = start + 30 * 60 * 1000;
    vi.setSystemTime(erroredAt);
    fixture.sockets.length = 0;
    fixture.instance.webSocketError(ws as WebSocket);
    await fixture.ready();
    expect(fixture.stored.get("room:lastActiveAt")).toBe(erroredAt);

    vi.setSystemTime(start + ROOM_IDLE_MS);
    await fixture.instance.alarm();
    expect(fixture.stored.has("statewire:snapshot")).toBe(true);
    expect(fixture.alarm.at).toBe(erroredAt + ROOM_IDLE_MS);
  });

  it("starts the idle clock of a setup stored before activity was recorded", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const fixture = createInstance(modelState());
    await fixture.ready();
    expect(fixture.stored.has("room:lastActiveAt")).toBe(false);

    const now = Date.now();
    await fixture.instance.alarm();
    expect(fixture.stored.has("statewire:snapshot")).toBe(true);
    expect(fixture.context.abort).not.toHaveBeenCalled();
    expect(fixture.stored.get("room:lastActiveAt")).toBe(now);
    expect(fixture.alarm.at).toBe(now + ROOM_IDLE_MS);

    vi.setSystemTime(now + ROOM_IDLE_MS);
    await fixture.instance.alarm();
    expect(fixture.stored.size).toBe(0);
    expect(fixture.context.abort).toHaveBeenCalledOnce();
  });

  it("refuses oversized statewire requests and socket messages", async () => {
    const fixture = createInstance(modelState());
    await connect(fixture);
    const big = "x".repeat(MAX_MESSAGE_BYTES + 1);
    expect(
      (await fixture.instance.fetch(request("frames", "POST", big))).status,
    ).toBe(413);
    const ws = { close: vi.fn() };
    fixture.instance.webSocketMessage(ws as unknown as WebSocket, big);
    expect(ws.close).toHaveBeenCalledWith(1009, "message too large");
  });

  it.each([
    "/",
    "/short",
    "/short/guide",
    "/has-dash-link",
    `/${"a".repeat(65)}`,
    "/../x",
  ])("answers 404 for %s without addressing a durable object", async (path) => {
    const idFromName = vi.fn((name: string) => name);
    const response = await worker.fetch(
      new Request(`https://checkout.test${path}`),
      { CHECKOUT: { idFromName, get: vi.fn() } },
    );
    expect(response.status).toBe(404);
    expect(idFromName).not.toHaveBeenCalled();
  });
});
