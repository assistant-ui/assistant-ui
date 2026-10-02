import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { CheckoutDO } from "./index";

const instances: CheckoutDO[] = [];

afterEach(() => {
  for (const instance of instances.splice(0)) instance.statewire.dispose();
});

const createInstance = () => {
  const stored = new Map<string, unknown>();
  const pending: Promise<unknown>[] = [];
  const context = {
    acceptWebSocket: vi.fn(),
    getWebSockets: () => [],
    storage: {
      get: async (key: string) => stored.get(key),
      put: async (key: string, value: unknown) => {
        stored.set(key, value);
      },
      delete: async (key: string) => stored.delete(key),
    },
    blockConcurrencyWhile: <T>(callback: () => Promise<T>) => {
      const promise = callback();
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

describe("CheckoutDO", () => {
  it("writes a secret separately from checkout state and consumes it once", async () => {
    const { instance, stored, ready } = createInstance();
    await ready();
    const put = await instance.fetch(request("secret/q1", "PUT", "test-key"));
    expect(put.status).toBe(204);
    expect(stored.get("secret:q1")).toBe("test-key");
    expect(
      JSON.stringify(stored.get("statewire:snapshot") ?? null),
    ).not.toContain("test-key");
    const get = await instance.fetch(request("secret/q1"));
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("test-key");
    expect(stored.has("secret:q1")).toBe(false);
    expect((await instance.fetch(request("secret/q1"))).status).toBe(404);
  });

  it("decodes secret identifiers and preserves rejection statuses", async () => {
    const { instance, stored, ready } = createInstance();
    await ready();
    expect(
      (await instance.fetch(request("secret/q%201", "PUT", ""))).status,
    ).toBe(400);
    expect(
      (await instance.fetch(request("secret/q%201", "PUT", "key"))).status,
    ).toBe(204);
    expect(stored.get("secret:q 1")).toBe("key");
    const rejected = await instance.fetch(request("secret/q%201", "POST"));
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("Allow")).toBe("GET, PUT");
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
