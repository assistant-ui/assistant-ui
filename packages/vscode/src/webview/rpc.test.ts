import { describe, expect, it } from "vitest";
import { VSCODE_BRIDGE_CHANNEL } from "../protocol";
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

  it("ignores a response whose payload does not match its kind", async () => {
    const listeners = new Set<(message: unknown) => void>();
    const port: VSCodeBridgePort = {
      postMessage: (message) => {
        const reply = (extra: object) =>
          queueMicrotask(() => {
            for (const listener of listeners) {
              listener({
                channel: VSCODE_BRIDGE_CHANNEL,
                kind: "rpc:response",
                id: message.id,
                ...extra,
              });
            }
          });
        reply({ ok: "yes", result: "malformed" });
        reply({ ok: true, result: "valid" });
      },
      onMessage: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    await expect(callHost(port, "storage.getItem", ["k"])).resolves.toBe(
      "valid",
    );
  });
});
