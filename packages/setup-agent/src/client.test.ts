import { describe, expect, it, vi } from "vitest";
import { connectCheckout } from "./client";

const { created } = vi.hoisted(() => ({
  created: [] as {
    options: { onError: (error: unknown) => void };
    state: unknown;
    listener: () => void;
    dispose: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  }[],
}));

vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal()),
  StatewireHttp: () => ({}),
  StatewireClient: class {
    state: unknown = undefined;
    listener = () => {};
    connection = { status: "connecting" };
    dispose = vi.fn();
    unsubscribe = vi.fn();
    options: { onError: (error: unknown) => void };
    constructor(options: { onError: (error: unknown) => void }) {
      this.options = options;
      created.push(this);
    }
    subscribe = (listener: () => void) => {
      this.listener = listener;
      return this.unsubscribe;
    };
  },
}));

describe("connectCheckout", () => {
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
