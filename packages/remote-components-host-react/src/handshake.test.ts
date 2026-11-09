// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { registerFrame } from "./handshake.js";

const hello = (nonce: string) => ({
  jsonrpc: "2.0",
  id: "session-1",
  method: "rc/initialize",
  params: {
    nonce,
    session: "session-1",
    protocol: { min: 3, max: 3 },
    runtime: "test",
  },
});

describe("registerFrame", () => {
  it("keeps listening in every window that has frames (remotes portaled into a pop-out)", () => {
    const popout = new JSDOM("").window as unknown as Window;
    const remoteA = new JSDOM("").window as unknown as Window;
    const remoteB = new JSDOM("").window as unknown as Window;
    const onA = vi.fn();
    const onB = vi.fn();
    const offA = registerFrame(
      "nonce-a",
      { window: () => remoteA, origin: "https://a.example", onInitialize: onA },
      window,
    );
    const offB = registerFrame(
      "nonce-b",
      { window: () => remoteB, origin: "https://b.example", onInitialize: onB },
      popout,
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        data: hello("nonce-a"),
        origin: "https://a.example",
        source: remoteA as never,
      }),
    );
    popout.dispatchEvent(
      new (popout as unknown as typeof globalThis).MessageEvent("message", {
        data: hello("nonce-b"),
        origin: "https://b.example",
        source: remoteB as never,
      }),
    );
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).toHaveBeenCalledTimes(1);
    offA();
    offB();
    window.dispatchEvent(
      new MessageEvent("message", {
        data: hello("nonce-a"),
        origin: "https://a.example",
        source: remoteA as never,
      }),
    );
    expect(onA).toHaveBeenCalledTimes(1);
  });
});
