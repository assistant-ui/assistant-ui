import { isHostToWebviewMessage, VSCODE_BRIDGE_CHANNEL } from "../protocol";
import type { VSCodeBridgePort } from "./fetch";

const idPrefix = `rpc-${Math.random().toString(36).slice(2, 10)}`;
let nextId = 0;

export const callHost = (
  port: VSCodeBridgePort,
  method: string,
  params: unknown[],
): Promise<unknown> => {
  const id = `${idPrefix}-${++nextId}`;
  return new Promise((resolve, reject) => {
    const unsubscribe = port.onMessage((message) => {
      if (!isHostToWebviewMessage(message) || message.id !== id) return;
      if (message.kind !== "rpc:response") return;
      unsubscribe();
      if (message.ok) resolve(message.result);
      else reject(new Error(message.message));
    });
    try {
      port.postMessage({
        channel: VSCODE_BRIDGE_CHANNEL,
        kind: "rpc:request",
        id,
        method,
        params,
      });
    } catch (error) {
      unsubscribe();
      reject(error);
    }
  });
};
