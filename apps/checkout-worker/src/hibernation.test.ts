import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatewireClient, StatewireWebsocket } from "statewire";
import { initialCheckoutState, type Checkout } from "setup-agent";
import { CheckoutDO } from "./index";

declare const setImmediate: (callback: () => void) => unknown;

/**
 * A stand-in for the Durable Objects runtime with the WebSocket Hibernation
 * API: accepted sockets, their attachments and storage outlive the object,
 * `hibernate()` drops the instance once it is idle (no timer it set is
 * pending), and the next event (a message, a close, a request) constructs a
 * new one, as Cloudflare does on wake.
 */
type Listener = {
  message: (data: string) => void;
  close: (code: number, reason: string) => void;
};

class End {
  peer!: End;
  closed = false;
  attachment: unknown;
  listener: Listener | null = null;
  send(data: string) {
    if (this.closed) throw new Error("socket closed");
    const peer = this.peer;
    setImmediate(() => peer.listener?.message(data));
  }
  close(code = 1000, reason = "") {
    if (this.closed) return;
    this.closed = true;
    const peer = this.peer;
    setImmediate(() => {
      if (peer.closed) return;
      peer.closed = true;
      peer.listener?.close(code, reason);
    });
  }
  serializeAttachment(value: unknown) {
    if (JSON.stringify(value).length > 16 * 1024)
      throw new Error("attachment too large");
    this.attachment = structuredClone(value);
  }
  deserializeAttachment() {
    return structuredClone(this.attachment);
  }
}

class FakeWebSocketPair {
  0: End;
  1: End;
  constructor() {
    this[0] = new End();
    this[1] = new End();
    this[0].peer = this[1];
    this[1].peer = this[0];
  }
}

class FakeAutoResponse {
  request: string;
  response: string;
  constructor(request: string, response: string) {
    this.request = request;
    this.response = response;
  }
}

/** Node's Response refuses status 101; workerd's carries the client socket on it. */
class UpgradeResponse extends Response {
  socket: End | null;
  constructor(
    body?: BodyInit | null,
    init?: ResponseInit & { webSocket?: End },
  ) {
    const upgrade = init?.status === 101;
    super(body, upgrade ? { ...init, status: 200, webSocket: null } : init);
    this.socket = init?.webSocket ?? null;
    if (upgrade) Object.defineProperty(this, "status", { value: 101 });
  }
}

/** Code that runs inside the object: this worker, @statewire/cloudflare and the statewire host. */
const OBJECT_CODE =
  /statewire[+/\\]cloudflare|checkout-worker[/\\]src[/\\]index|statewire[/\\]src[/\\]host/;
const ErrorWithLimit = Error as unknown as { stackTraceLimit: number };
/** Timers the object armed that have not fired or been cleared; they keep it awake. */
const objectTimers = new Map<unknown, string>();
/** Every timer the object armed, for tests that check none is. */
const armedTimers: string[] = [];
const stubTimers = () => {
  const real = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  const fromObject = () => {
    const limit = ErrorWithLimit.stackTraceLimit;
    ErrorWithLimit.stackTraceLimit = 100;
    const stack = new Error().stack ?? "";
    ErrorWithLimit.stackTraceLimit = limit;
    return OBJECT_CODE.test(stack) ? stack : null;
  };
  vi.stubGlobal("setTimeout", (fn: () => void, ms?: number) => {
    const stack = fromObject();
    const handle: unknown = real.setTimeout(() => {
      objectTimers.delete(handle);
      fn();
    }, ms);
    if (stack !== null) {
      objectTimers.set(handle, stack);
      armedTimers.push(stack);
    }
    return handle;
  });
  vi.stubGlobal("setInterval", (fn: () => void, ms?: number) => {
    const stack = fromObject();
    const handle = real.setInterval(fn, ms);
    if (stack !== null) {
      objectTimers.set(handle, stack);
      armedTimers.push(stack);
    }
    return handle;
  });
  vi.stubGlobal(
    "clearTimeout",
    (handle: Parameters<typeof clearTimeout>[0]) => {
      objectTimers.delete(handle);
      real.clearTimeout(handle);
    },
  );
  vi.stubGlobal(
    "clearInterval",
    (handle: Parameters<typeof clearInterval>[0]) => {
      objectTimers.delete(handle);
      real.clearInterval(handle);
    },
  );
};

const snapshot = (): Checkout.State => ({
  ...initialCheckoutState(),
  id: "setup-a",
  status: "planning",
  createdAt: 1,
});

const createRuntime = () => {
  const stored = new Map<string, unknown>([["statewire:snapshot", snapshot()]]);
  const accepted: End[] = [];
  let autoResponse: FakeAutoResponse | null = null;
  let alarm: number | null = null;
  let current: { instance: CheckoutDO; ready: () => Promise<unknown> } | null =
    null;
  const counts = { wakes: 0, instances: [] as CheckoutDO[] };

  const construct = () => {
    const pending: Promise<unknown>[] = [];
    let gate: Promise<unknown> = Promise.resolve();
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => {
        pending.push(promise);
      },
      acceptWebSocket: (ws: End) => {
        accepted.push(ws);
        ws.listener = {
          message: (data) => void deliver(ws, data),
          close: () => {
            accepted.splice(accepted.indexOf(ws), 1);
            void awake().then((instance) =>
              instance.webSocketClose(ws as unknown as WebSocket),
            );
          },
        };
      },
      getWebSockets: () => [...accepted],
      setWebSocketAutoResponse: (pair: FakeAutoResponse) => {
        autoResponse = pair;
      },
      abort: vi.fn(),
      storage: {
        get: async (key: string) => structuredClone(stored.get(key)),
        put: async (key: string, value: unknown) => {
          stored.set(key, structuredClone(value));
        },
        delete: async (key: string) => stored.delete(key),
        deleteAll: async () => stored.clear(),
        list: async ({ prefix = "" }: { prefix?: string }) =>
          new Map([...stored].filter(([key]) => key.startsWith(prefix))),
        getAlarm: async () => alarm,
        setAlarm: async (at: number) => {
          alarm = at;
        },
        deleteAlarm: async () => {
          alarm = null;
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
      ctx as unknown as ConstructorParameters<typeof CheckoutDO>[0],
      {
        CHECKOUT: { idFromName: (name) => name, get: vi.fn() },
        NEW_LINKS: { limit: async () => ({ success: true }) },
      },
    );
    counts.instances.push(instance);
    counts.wakes++;
    return { instance, ready: () => Promise.all(pending) };
  };

  const awake = async () => {
    current ??= construct();
    const { instance, ready } = current;
    await ready();
    return instance;
  };

  const deliver = async (ws: End, data: string) => {
    if (autoResponse !== null && data === autoResponse.request) {
      ws.send(autoResponse.response);
      return;
    }
    const instance = await awake();
    instance.webSocketMessage(ws as unknown as WebSocket, data);
  };

  /** Resolves once the object has no pending work or timer, so it may hibernate. */
  const idle = async () => {
    await current?.ready();
    await vi.waitFor(() => expect([...objectTimers.values()]).toEqual([]), {
      timeout: 3000,
    });
  };

  /** The client-side socket StatewireWebsocket dials; it reaches the object through fetch. */
  class ClientWebSocket {
    readyState = 0;
    protocol = "";
    onopen: ((event: unknown) => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    #end: End | null = null;
    constructor(url: string, protocols: string[]) {
      void (async () => {
        const instance = await awake();
        const response = (await instance.fetch(
          new Request(url.replace(/^ws/, "http"), {
            headers: {
              Upgrade: "websocket",
              "Sec-WebSocket-Protocol": protocols.join(", "),
            },
          }),
        )) as UpgradeResponse;
        if (response.status !== 101 || response.socket === null) {
          this.readyState = 3;
          this.onclose?.({ code: 1006, reason: "refused" });
          return;
        }
        const end = response.socket;
        this.#end = end;
        end.listener = {
          message: (data) => this.onmessage?.({ data }),
          close: (code, reason) => {
            this.readyState = 3;
            this.onclose?.({ code, reason });
          },
        };
        this.protocol = response.headers.get("Sec-WebSocket-Protocol") ?? "";
        this.readyState = 1;
        this.onopen?.({});
      })();
    }
    send(data: string) {
      this.#end!.send(data);
    }
    close(code = 1000) {
      if (this.readyState >= 2) return;
      this.readyState = 2;
      this.#end?.close(code);
      setImmediate(() => {
        this.readyState = 3;
        this.onclose?.({ code, reason: "" });
      });
    }
  }

  return {
    counts,
    stored,
    accepted,
    idle,
    /** Evicts the object, as the runtime does once it is idle and hibernatable. */
    hibernate: async () => {
      await idle();
      current = null;
    },
    /** A dropped connection: both ends see it close, as a network failure does. */
    drop: (ws: End) => {
      for (const end of [ws, ws.peer]) {
        end.closed = true;
        setImmediate(() => end.listener?.close(1006, "network"));
      }
    },
    connect: async () => {
      const client = new StatewireClient<
        Checkout.State | undefined,
        Checkout.Commands
      >({
        transport: StatewireWebsocket({
          url: "https://checkout.test/session1",
          webSocket: ClientWebSocket as unknown as typeof WebSocket,
        }),
      });
      clients.push(client);
      await vi.waitFor(() => expect(client.state?.id).toBe("setup-a"));
      return client;
    },
  };
};

const clients: StatewireClient<
  Checkout.State | undefined,
  Checkout.Commands
>[] = [];
let runtimes: ReturnType<typeof createRuntime>[] = [];
const runtime = () => {
  const created = createRuntime();
  runtimes.push(created);
  return created;
};

beforeEach(() => {
  vi.stubGlobal("WebSocketPair", FakeWebSocketPair);
  vi.stubGlobal("WebSocketRequestResponsePair", FakeAutoResponse);
  vi.stubGlobal("Response", UpgradeResponse);
  stubTimers();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.dispose();
  for (const created of runtimes)
    for (const instance of created.counts.instances)
      instance.statewire.dispose();
  runtimes = [];
  vi.unstubAllGlobals();
  objectTimers.clear();
  armedTimers.length = 0;
});

describe("hibernation", () => {
  it("relays commands both ways across hibernation, restoring state from storage and attachments", async () => {
    const rt = runtime();
    const agent = await rt.connect();
    const browser = await rt.connect();
    expect(rt.accepted).toHaveLength(2);

    await rt.hibernate();
    await agent.commands["agent/hello"]({ cwd: "/app" });
    const { inputId } = await agent.commands["agent/ask"]({
      prompt: "Project name?",
    });
    await vi.waitFor(() =>
      expect(browser.state?.inputs.map((input) => input.id)).toEqual([inputId]),
    );
    expect(browser.state?.agent.cwd).toBe("/app");
    expect(rt.counts.wakes).toBe(2);

    await rt.hibernate();
    await browser.commands["checkout/answer"]({ inputId, answer: "shop" });
    await vi.waitFor(() =>
      expect(agent.state?.inputs[0]).toMatchObject({
        status: "answered",
        answer: "shop",
      }),
    );
    // The woken object rebuilt the setup from storage, not from memory.
    expect(rt.counts.wakes).toBe(3);
    expect(agent.state?.agent.cwd).toBe("/app");
    await rt.idle();
    expect(rt.stored.get("statewire:snapshot")).toMatchObject({
      agent: { cwd: "/app" },
      inputs: [{ id: inputId, status: "answered", answer: "shop" }],
    });
  });

  it("answers pings without waking the object", async () => {
    const rt = runtime();
    await rt.connect();
    await rt.hibernate();
    const [server] = rt.accepted;
    const replies: string[] = [];
    server!.peer.listener = {
      message: (data) => replies.push(data),
      close: () => {},
    };
    server!.peer.send("{}");
    await vi.waitFor(() => expect(replies).toEqual(["{}"]));
    expect(rt.counts.wakes).toBe(1);
  });

  it("keeps no timer on an idle connection, and only statewire's one-second save after a command", async () => {
    const rt = runtime();
    const agent = await rt.connect();
    const browser = await rt.connect();
    // Connecting saves the client records on statewire's debounce; let it land.
    await rt.idle();
    armedTimers.length = 0;

    // Two open sockets and no traffic: nothing keeps the object awake.
    await new Promise((resolve) => setImmediate(() => resolve(undefined)));
    expect([...objectTimers.values()]).toEqual([]);

    await agent.commands["agent/heartbeat"]();
    await browser.commands["browser/heartbeat"]();
    await vi.waitFor(() => expect(agent.state?.browser?.connected).toBe(true));
    // @statewire/cloudflare saves the state and client records on a 1 s
    // debounce after each command; that is the only timer, and it ends.
    expect(armedTimers.length).toBeGreaterThan(0);
    for (const stack of armedTimers) expect(stack).toContain("schedulePersist");
    await rt.idle();
    expect(rt.stored.get("statewire:snapshot")).toMatchObject({
      agent: { connected: true },
      browser: { connected: true },
    });
  });

  it("delivers a close to a woken object, and the other side sees the agent leave", async () => {
    const rt = runtime();
    const agent = await rt.connect();
    const browser = await rt.connect();
    await agent.commands["agent/hello"]({ cwd: "/app" });
    await vi.waitFor(() => expect(browser.state?.agent.connected).toBe(true));

    await agent.commands["agent/bye"]();
    await rt.hibernate();
    agent.dispose();
    await vi.waitFor(() => expect(rt.accepted).toHaveLength(1));
    await vi.waitFor(() => expect(browser.state?.agent.connected).toBe(false));
    expect(rt.counts.wakes).toBe(2);

    // The browser's socket keeps working on the object the close woke.
    await rt.hibernate();
    await browser.commands["browser/heartbeat"]();
    await rt.idle();
    expect(
      (rt.stored.get("statewire:snapshot") as Checkout.State).browser
        ?.connected,
    ).toBe(true);
    expect(rt.counts.wakes).toBe(3);
  });

  it("reconnects a dropped socket after hibernation and keeps relaying", async () => {
    const rt = runtime();
    const agent = await rt.connect();
    const browser = await rt.connect();
    await agent.commands["agent/hello"]({ cwd: "/app" });

    await rt.hibernate();
    const agentSocket = rt.accepted[0]!;
    rt.drop(agentSocket);
    // The client dials again and the object wakes for the upgrade.
    await vi.waitFor(() => {
      expect(rt.accepted).toHaveLength(2);
      expect(rt.accepted).not.toContain(agentSocket);
    });
    const { inputId } = await agent.commands["agent/ask"]({
      prompt: "Project name?",
    });
    await vi.waitFor(() =>
      expect(browser.state?.inputs.map((input) => input.id)).toEqual([inputId]),
    );
    expect(agent.state?.agent.cwd).toBe("/app");
    await browser.commands["checkout/answer"]({ inputId, answer: "shop" });
    await vi.waitFor(() => expect(agent.state?.inputs[0]?.answer).toBe("shop"));
  });
});
