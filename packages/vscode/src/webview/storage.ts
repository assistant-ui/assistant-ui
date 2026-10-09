import type { AsyncStorageLike } from "@assistant-ui/core/react";
import { webviewPort, type VSCodeBridgePort } from "./fetch";
import { callHost } from "./rpc";

/**
 * Creates an `AsyncStorageLike` backed by the `storage` Memento passed to
 * `serveWebviewHost`, for `createLocalStorageAdapter({ storage })`.
 */
export function createVSCodeStorage(
  port: VSCodeBridgePort = webviewPort,
): AsyncStorageLike {
  return {
    getItem: async (key) => {
      const value = await callHost(port, "storage.getItem", [key]);
      return typeof value === "string" ? value : null;
    },
    setItem: async (key, value) => {
      await callHost(port, "storage.setItem", [key, value]);
    },
    removeItem: async (key) => {
      await callHost(port, "storage.removeItem", [key]);
    },
  };
}
