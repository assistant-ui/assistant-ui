import { afterEach, describe, expect, it, vi } from "vitest";
import { connectCheckout } from "./client";

/** A socket the server refuses during the handshake: it closes before it opens. */
class RefusedWebSocket {
  readyState = 0;
  protocol = "";
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  constructor() {
    setTimeout(() => {
      this.readyState = 3;
      this.onerror?.();
      this.onclose?.({ code: 1006, reason: "" });
    }, 0);
  }
  send() {
    throw new Error("not open");
  }
  close() {}
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connectCheckout against a server that refuses the link", () => {
  it("fails with the server's answer instead of retrying the socket forever", async () => {
    vi.stubGlobal("WebSocket", RefusedWebSocket);
    const fetch = vi.fn(async () => new Response("Not found", { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    await expect(
      connectCheckout("https://checkout.test/short"),
    ).rejects.toThrow("setup unreachable: protocol-error (HTTP 404)");
    expect(fetch).toHaveBeenCalled();
  });
});
