import { afterEach, describe, expect, it, vi } from "vitest";
import { connectCheckout } from "./client";

const { created } = vi.hoisted(() => ({
  created: [] as {
    options: { onError: (error: unknown) => void; transport: unknown };
    state: unknown;
    listener: () => void;
    dispose: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  }[],
}));

vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal()),
  StatewireHttp: (options: unknown) => ({ http: options }),
  StatewireWebsocket: (options: unknown) => ({ websocket: options }),
  StatewireClient: class {
    state: unknown = undefined;
    listener = () => {};
    connection = { status: "connecting" };
    dispose = vi.fn();
    unsubscribe = vi.fn();
    options: { onError: (error: unknown) => void; transport: unknown };
    constructor(options: {
      onError: (error: unknown) => void;
      transport: unknown;
    }) {
      this.options = options;
      created.push(this);
    }
    subscribe = (listener: () => void) => {
      this.listener = listener;
      return this.unsubscribe;
    };
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connectCheckout", () => {
  it("attaches over a WebSocket, so the setup server can hibernate", () => {
    vi.stubGlobal("WebSocket", class {});
    void connectCheckout("https://checkout.test/session");
    expect(created.at(-1)!.options.transport).toEqual({
      websocket: { url: "https://checkout.test/session" },
    });
  });

  it("falls back to SSE where there is no global WebSocket (Node 20)", () => {
    vi.stubGlobal("WebSocket", undefined);
    void connectCheckout("https://checkout.test/session");
    expect(created.at(-1)!.options.transport).toEqual({
      http: { url: "https://checkout.test/session" },
    });
  });

  it("disposes the client when the first connection fails", async () => {
    const connecting = connectCheckout("https://checkout.test/session");
    const client = created.at(-1)!;
    client.options.onError(new Error("offline"));
    await expect(connecting).rejects.toThrow("offline");
    expect(client.unsubscribe).toHaveBeenCalled();
    expect(client.dispose).toHaveBeenCalled();
  });

  it("keeps the client it resolved with when a later error arrives", async () => {
    const connecting = connectCheckout("https://checkout.test/session");
    const client = created.at(-1)!;
    client.state = {};
    client.listener();
    await expect(connecting).resolves.toBe(client);
    client.options.onError(new Error("later"));
    expect(client.dispose).not.toHaveBeenCalled();
  });
});
