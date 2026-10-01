import { describe, expect, it } from "vitest";
import type { VSCodeBridgePort } from "./fetch";
import { callHost } from "./rpc";

describe("callHost", () => {
  it("rejects and stops listening when the message cannot be posted", async () => {
    const listeners = new Set<(message: unknown) => void>();
    const port: VSCodeBridgePort = {
      postMessage: () => {
        throw new Error("webview disposed");
      },
      onMessage: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    await expect(callHost(port, "storage.getItem", ["k"])).rejects.toThrow(
      "webview disposed",
    );
    expect(listeners.size).toBe(0);
  });
});
