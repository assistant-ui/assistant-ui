import type {
  SkybridgeRuntime,
  SkybridgeController,
  SkybridgeCallbacks,
  SkybridgeConnection,
  DisplayMode,
} from "../types";
import { OPENAI_RUNTIME_CODE } from "./openai-runtime-code";

// Message types from iframe
interface CallMessage {
  type: "openskybridge.call";
  method: string;
  args: unknown;
}

interface RequestMessage {
  type: "openskybridge.request";
  id: string;
  method: string;
  args: unknown;
}

type BridgeMessage = CallMessage | RequestMessage;

function isMessageType<T extends BridgeMessage>(
  data: unknown,
  type: T["type"]
): data is T {
  return typeof data === "object" && data !== null && (data as T).type === type;
}

export function openaiSkybridge(): SkybridgeRuntime {
  return {
    runtimeCode: OPENAI_RUNTIME_CODE,

    connect(
      controller: SkybridgeController,
      callbacks: SkybridgeCallbacks
    ): SkybridgeConnection {
      // Handle messages from iframe
      const unsubscribe = controller.onMessage((data: unknown) => {
        // Fire-and-forget calls
        if (isMessageType<CallMessage>(data, "openskybridge.call")) {
          const { method, args } = data;

          if (method === "requestClose") {
            callbacks.onRequestClose?.();
          } else if (method === "openExternal") {
            callbacks.onOpenExternal?.(args as { href: string });
          }
        }

        // Request-response calls
        if (isMessageType<RequestMessage>(data, "openskybridge.request")) {
          const { id, method, args } = data;

          const sendResponse = (
            result?: unknown,
            error?: { message: string }
          ) => {
            controller.postMessage({
              type: "openskybridge.response",
              id,
              result,
              error,
            });
          };

          const handleAsync = async (fn: () => Promise<unknown>) => {
            try {
              const result = await fn();
              sendResponse(result);
            } catch (e) {
              sendResponse(undefined, {
                message: e instanceof Error ? e.message : "Unknown error",
              });
            }
          };

          if (method === "callTool" && callbacks.onCallTool) {
            const { name, args: toolArgs } = args as {
              name: string;
              args: Record<string, unknown>;
            };
            handleAsync(() => callbacks.onCallTool!(name, toolArgs));
          } else if (
            method === "sendFollowUpMessage" &&
            callbacks.onSendFollowUpMessage
          ) {
            handleAsync(() =>
              callbacks.onSendFollowUpMessage!(args as { prompt: string })
            );
          } else if (
            method === "requestDisplayMode" &&
            callbacks.onRequestDisplayMode
          ) {
            handleAsync(() =>
              callbacks.onRequestDisplayMode!(args as { mode: DisplayMode })
            );
          } else if (method === "setWidgetState" && callbacks.onSetWidgetState) {
            handleAsync(() =>
              callbacks.onSetWidgetState!(args as Record<string, unknown>)
            );
          } else {
            sendResponse(undefined, { message: `Unknown method: ${method}` });
          }
        }
      });

      return {
        updateState(state) {
          controller.postMessage({ type: "openskybridge.state", state });
        },
        disconnect() {
          unsubscribe();
        },
      };
    },
  };
}
