import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { CheckoutDO } from "./index";
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
  let gate: Promise<unknown> = Promise.resolve();
  const context = {
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise);
    },
    acceptWebSocket: vi.fn(),
    getWebSockets: () => [],
    storage: {
      get: async (key: string) => stored.get(key),
      put: async (key: string, value: unknown) => {
        stored.set(key, value);
      },
      delete: async (key: string) => stored.delete(key),
      list: async ({ prefix }: { prefix: string }) =>
        new Map([...stored].filter(([key]) => key.startsWith(prefix))),
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
  return { instance, stored, ready: () => Promise.all(pending) };
};

const request = (path: string, method = "GET", body?: string) =>
  new Request(`https://checkout.test/session/${path}`, {
    method,
    ...(body === undefined ? {} : { body }),
  });

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
) =>
  request(
    `secret/q1?setup=${encodeURIComponent(setup)}${secret === undefined ? "" : `&answer=${encodeURIComponent(answer)}`}`,
    method,
    secret,
  );

describe("secret lifecycle", () => {
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
        await fixture.instance.fetch(request("secret/q%201?setup=setup-a"))
      ).text(),
    ).toBe("key");
    expect(
      (await fixture.instance.fetch(request("secret/%ZZ?setup=setup-a")))
        .status,
    ).toBe(400);
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
    expect(idFromName).toHaveBeenCalledWith("session");
    expect(get).toHaveBeenCalledWith("session");
    expect(fetch.mock.calls[0]?.[0]?.url).toBe(
      "https://checkout.test/checkout/session/stream",
    );
    expect(await response.text()).toBe("state");
    expect(response.headers.get("Statewire-Lease")).toBe("lease-1");
    expect(response.headers.get("Access-Control-Expose-Headers")).toBe(
      "Statewire-Lease",
    );
  });
});
