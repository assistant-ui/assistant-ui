import type { RenderedFrame } from "safe-content-frame";
import {
  MCP_APP_PROTOCOL_VERSION,
  type MCPAppBridgeHandlers,
  type MCPAppDisplayMode,
  type MCPAppHostContext,
  type MCPAppHostInfo,
  type MCPAppJsonRpcMessage,
  type MCPAppJsonRpcNotification,
  type MCPAppJsonRpcRequest,
  type MCPAppJsonRpcResponse,
} from "./types";

const VALID_DISPLAY_MODES = [
  "inline",
  "fullscreen",
  "pip",
] as const satisfies readonly MCPAppDisplayMode[];

export type MCPAppBridgeFrame = Pick<
  RenderedFrame,
  "iframe" | "origin" | "sendMessage"
>;

export type CreateMCPAppBridgeOptions = {
  frame: MCPAppBridgeFrame;
  handlers?: MCPAppBridgeHandlers | undefined;
  hostInfo?: MCPAppHostInfo | undefined;
  hostContext?: MCPAppHostContext | undefined;
  targetWindow?: Window | undefined;
};

export type MCPAppBridge = {
  dispose: () => void;
  notifyToolInput: (input: unknown) => void;
  notifyToolResult: (result: unknown) => void;
  notifyHostContextChanged: (hostContext: MCPAppHostContext) => void;
};

const DEFAULT_HOST_INFO: MCPAppHostInfo = {
  name: "assistant-ui",
  version: "0.1",
};

const JSONRPC_ERROR = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const;

function isJsonRpcMessage(value: unknown): value is MCPAppJsonRpcMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

function isRequest(msg: MCPAppJsonRpcMessage): msg is MCPAppJsonRpcRequest {
  return "id" in msg && "method" in msg;
}

function isNotification(
  msg: MCPAppJsonRpcMessage,
): msg is MCPAppJsonRpcNotification {
  return !("id" in msg) && "method" in msg;
}

export function createMCPAppBridge(
  opts: CreateMCPAppBridgeOptions,
): MCPAppBridge {
  const {
    frame,
    handlers = {},
    hostInfo = DEFAULT_HOST_INFO,
    hostContext = {},
    targetWindow = typeof window !== "undefined" ? window : undefined,
  } = opts;

  if (!targetWindow) {
    throw new Error("createMCPAppBridge requires a window context");
  }

  const post = (msg: MCPAppJsonRpcMessage) => {
    frame.sendMessage(msg);
  };

  const respond = (
    id: MCPAppJsonRpcRequest["id"],
    payload:
      | { result: unknown }
      | { error: { code: number; message: string; data?: unknown } },
  ) => {
    const res: MCPAppJsonRpcResponse = {
      jsonrpc: "2.0",
      id,
      ...payload,
    };
    post(res);
  };

  const errorResponse = (
    id: MCPAppJsonRpcRequest["id"],
    code: number,
    message: string,
    data?: unknown,
  ) => {
    respond(id, {
      error: {
        code,
        message,
        ...(data !== undefined ? { data } : {}),
      },
    });
  };

  const handleRequest = async (req: MCPAppJsonRpcRequest) => {
    try {
      const params = req.params;

      switch (req.method) {
        case "ui/initialize": {
          respond(req.id, {
            result: {
              protocolVersion: MCP_APP_PROTOCOL_VERSION,
              host: hostInfo,
              hostContext,
              capabilities: {
                tools: handlers.callTool ? {} : undefined,
                resources:
                  handlers.readResource || handlers.listResources
                    ? {}
                    : undefined,
                ui: {
                  sendMessage: !!handlers.sendMessage,
                  openLink: !!handlers.openLink,
                  requestDisplayMode: !!handlers.requestDisplayMode,
                  updateModelContext: !!handlers.updateModelContext,
                },
              },
            },
          });
          return;
        }

        case "tools/call": {
          if (!handlers.callTool) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "tools/call is not supported by this host",
            );
            return;
          }
          const callParams = (params ?? {}) as {
            name?: unknown;
            arguments?: unknown;
          };
          if (typeof callParams.name !== "string") {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              "tools/call requires a string 'name'",
            );
            return;
          }
          if (
            handlers.allowedTools &&
            !handlers.allowedTools.includes(callParams.name)
          ) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              `tool '${callParams.name}' is not allowed for this app`,
            );
            return;
          }
          let callArgs: Record<string, unknown> | undefined;
          if (callParams.arguments !== undefined) {
            if (
              callParams.arguments === null ||
              typeof callParams.arguments !== "object" ||
              Array.isArray(callParams.arguments)
            ) {
              errorResponse(
                req.id,
                JSONRPC_ERROR.invalidParams,
                "tools/call 'arguments' must be an object",
              );
              return;
            }
            callArgs = callParams.arguments as Record<string, unknown>;
          }
          const result = await handlers.callTool({
            name: callParams.name,
            ...(callArgs !== undefined ? { arguments: callArgs } : {}),
          });
          respond(req.id, { result });
          return;
        }

        case "resources/read": {
          if (!handlers.readResource) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "resources/read is not supported by this host",
            );
            return;
          }
          const readParams = (params ?? {}) as { uri?: unknown };
          if (typeof readParams.uri !== "string") {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              "resources/read requires a string 'uri'",
            );
            return;
          }
          respond(req.id, {
            result: await handlers.readResource({ uri: readParams.uri }),
          });
          return;
        }

        case "resources/list": {
          if (!handlers.listResources) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "resources/list is not supported by this host",
            );
            return;
          }
          respond(req.id, { result: await handlers.listResources(params) });
          return;
        }

        case "openLink": {
          if (!handlers.openLink) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "openLink is not supported by this host",
            );
            return;
          }
          const linkParams = (params ?? {}) as { url?: unknown };
          if (typeof linkParams.url !== "string") {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              "openLink requires a string 'url'",
            );
            return;
          }
          let linkProtocol: string;
          try {
            linkProtocol = new URL(linkParams.url).protocol;
          } catch {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              "openLink requires a valid URL",
            );
            return;
          }
          if (linkProtocol !== "https:" && linkProtocol !== "http:") {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              "openLink only accepts http(s) URLs",
            );
            return;
          }
          respond(req.id, {
            result: await handlers.openLink({ url: linkParams.url }),
          });
          return;
        }

        case "sendMessage": {
          if (!handlers.sendMessage) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "sendMessage is not supported by this host",
            );
            return;
          }
          respond(req.id, { result: await handlers.sendMessage(params) });
          return;
        }

        case "updateModelContext": {
          if (!handlers.updateModelContext) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "updateModelContext is not supported by this host",
            );
            return;
          }
          respond(req.id, {
            result: await handlers.updateModelContext(params),
          });
          return;
        }

        case "requestDisplayMode": {
          if (!handlers.requestDisplayMode) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.methodNotFound,
              "requestDisplayMode is not supported by this host",
            );
            return;
          }
          const modeParams = (params ?? {}) as { mode?: unknown };
          if (
            typeof modeParams.mode !== "string" ||
            !VALID_DISPLAY_MODES.includes(modeParams.mode as MCPAppDisplayMode)
          ) {
            errorResponse(
              req.id,
              JSONRPC_ERROR.invalidParams,
              "requestDisplayMode requires a valid 'mode'",
            );
            return;
          }
          respond(req.id, {
            result: await handlers.requestDisplayMode({
              mode: modeParams.mode as MCPAppDisplayMode,
            }),
          });
          return;
        }

        default: {
          errorResponse(
            req.id,
            JSONRPC_ERROR.methodNotFound,
            `Unknown method: ${req.method}`,
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      handlers.onError?.(err instanceof Error ? err : new Error(message));
      errorResponse(req.id, JSONRPC_ERROR.internalError, message);
    }
  };

  const handleNotification = (note: MCPAppJsonRpcNotification) => {
    switch (note.method) {
      case "notifications/initialized": {
        handlers.onInitialized?.();
        return;
      }
      case "notifications/size_changed": {
        const p = (note.params ?? {}) as { width?: number; height?: number };
        handlers.onSizeChange?.({
          ...(typeof p.width === "number" ? { width: p.width } : {}),
          ...(typeof p.height === "number" ? { height: p.height } : {}),
        });
        return;
      }
      case "notifications/log": {
        handlers.onLog?.(note.params);
        return;
      }
      case "notifications/request_teardown": {
        handlers.onRequestTeardown?.(note.params);
        return;
      }
      case "notifications/error": {
        const p = (note.params ?? {}) as { message?: string };
        handlers.onError?.(
          new Error(typeof p.message === "string" ? p.message : "Widget error"),
        );
        return;
      }
      default:
        return;
    }
  };

  // Cross-origin guard: ignore any postMessage not originating from this
  // app's iframe contentWindow at the SafeContentFrame-issued origin.
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.iframe.contentWindow) return;
    if (event.origin !== frame.origin) return;
    if (!isJsonRpcMessage(event.data)) return;

    const msg = event.data;
    if (isRequest(msg)) {
      void handleRequest(msg);
    } else if (isNotification(msg)) {
      handleNotification(msg);
    }
  };

  targetWindow.addEventListener("message", onMessage);

  return {
    dispose: () => {
      targetWindow.removeEventListener("message", onMessage);
    },
    notifyToolInput: (input: unknown) => {
      post({
        jsonrpc: "2.0",
        method: "notifications/tools/call/input",
        params: { input },
      });
    },
    notifyToolResult: (result: unknown) => {
      post({
        jsonrpc: "2.0",
        method: "notifications/tools/call/result",
        params: { result },
      });
    },
    notifyHostContextChanged: (ctx: MCPAppHostContext) => {
      post({
        jsonrpc: "2.0",
        method: "notifications/host_context/changed",
        params: ctx,
      });
    },
  };
}
