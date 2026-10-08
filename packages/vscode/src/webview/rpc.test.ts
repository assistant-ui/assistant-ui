import { describe, expect, it, vi } from "vitest";
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

  it("uses cryptographic randomness for RPC id prefixes", async () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random must not be used for request ids");
    });
    try {
      vi.resetModules();
      const { callHost: freshCallHost } = await import("./rpc");
      let id = "";
      const port: VSCodeBridgePort = {
        postMessage: (message) => {
          id = message.id;
          queueMicrotask(() =>
            listener?.({
              channel: VSCODE_BRIDGE_CHANNEL,
              kind: "rpc:response",
              id,
              ok: true,
              result: null,
            }),
          );
        },
        onMessage: (callback) => {
          listener = callback;
          return () => {
            listener = undefined;
          };
        },
      };
      let listener: ((message: unknown) => void) | undefined;
      await expect(freshCallHost(port, "test", [])).resolves.toBeNull();
      expect(id).toMatch(/^rpc-[0-9a-f]{16}-1$/);
    } finally {
      random.mockRestore();
    }
  });
});
