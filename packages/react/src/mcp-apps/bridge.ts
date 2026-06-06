import type { RenderedFrame } from "safe-content-frame";
import {
  MCP_APP_PROTOCOL_VERSION,
  type McpAppBridgeHandlers,
  type McpAppDisplayMode,
  type McpAppHostContext,
  type McpAppHostInfo,
  type McpAppJsonRpcMessage,
  type McpAppJsonRpcNotification,
  type McpAppJsonRpcRequest,
  type McpAppJsonRpcResponse,
} from "./types";

const VALID_DISPLAY_MODES = [
  "inline",
  "fullscreen",
  "pip",
] as const satisfies readonly McpAppDisplayMode[];

export type McpAppBridgeFrame = Pick<
  RenderedFrame,
  "iframe" | "origin" | "sendMessage"
>;

export type CreateMcpAppBridgeOptions = {
  frame: McpAppBridgeFrame;
  handlers?: McpAppBridgeHandlers | undefined;
  hostInfo?: McpAppHostInfo | undefined;
  hostContext?: McpAppHostContext | undefined;
  targetWindow?: Window | undefined;
};

export type McpAppBridge = {
  dispose: () => void;
  notifyToolInput: (input: unknown) => void;
  notifyToolResult: (result: unknown) => void;
  notifyHostContextChanged: (hostContext: McpAppHostContext) => void;
};

const DEFAULT_HOST_INFO: McpAppHostInfo = {
  name: "assistant-ui",
  version: "0.1",
};

// Accept both the legacy method names and the MCP-UI 2026-01-26 names that
// `ui/*` capable widgets (e.g. xmcp's host-bridge) emit. Normalize on input
// so downstream switch statements only need to know the legacy names.
const METHOD_ALIASES: Record<string, string> = {
  "ui/notifications/initialized": "notifications/initialized",
  "ui/notifications/size-changed": "notifications/size_changed",
  "ui/request-display-mode": "requestDisplayMode",
  "ui/open-link": "openLink",
  "ui/update-model-context": "updateModelContext",
  "ui/message": "sendMessage",
  "notifications/message": "notifications/log",
};

const normalizeMethod = (method: string): string =>
  METHOD_ALIASES[method] ?? method;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const JSONRPC_ERROR = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const;

function isJsonRpcMessage(value: unknown): value is McpAppJsonRpcMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

function isRequest(msg: McpAppJsonRpcMessage): msg is McpAppJsonRpcRequest {
  return "id" in msg;
}

function isNotification(
  msg: McpAppJsonRpcMessage,
): msg is McpAppJsonRpcNotification {
  return !("id" in msg);
}

export function createMcpAppBridge(
  opts: CreateMcpAppBridgeOptions,
): McpAppBridge {
  const {
    frame,
    handlers = {},
    hostInfo = DEFAULT_HOST_INFO,
    hostContext = {},
    targetWindow = typeof window !== "undefined" ? window : undefined,
  } = opts;

  if (!targetWindow) {
    throw new Error("createMcpAppBridge requires a window context");
  }

  const post = (msg: McpAppJsonRpcMessage) => {
    frame.sendMessage(msg);
  };

  const respond = (
    id: McpAppJsonRpcRequest["id"],
    payload:
      | { result: unknown }
      | { error: { code: number; message: string; data?: unknown } },
  ) => {
    const res: McpAppJsonRpcResponse = {
      jsonrpc: "2.0",
      id,
      ...payload,
    };
    post(res);
  };

  const errorResponse = (
    id: McpAppJsonRpcRequest["id"],
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

  const handleRequest = async (req: McpAppJsonRpcRequest) => {
    try {
      const params = req.params;

      switch (normalizeMethod(req.method)) {
        case "ui/initialize": {
          const requestedProtocolVersion =
            isRecord(params) && typeof params.protocolVersion === "string"
              ? params.protocolVersion
              : MCP_APP_PROTOCOL_VERSION;
          respond(req.id, {
            result: {
              protocolVersion: requestedProtocolVersion,
              host: hostInfo,
              hostInfo,
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
              hostCapabilities: {
                ...(handlers.openLink ? { openLinks: {} } : {}),
                ...(handlers.callTool ? { serverTools: {} } : {}),
                ...(handlers.readResource || handlers.listResources
                  ? { serverResources: {} }
                  : {}),
                ...(handlers.updateModelContext
                  ? { updateModelContext: { text: {} } }
                  : {}),
                ...(handlers.sendMessage ? { message: { text: {} } } : {}),
                ...(handlers.onLog ? { logging: {} } : {}),
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
          respond(req.id, {
            result: (await handlers.listResources(params)) ?? null,
          });
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
          respond(req.id, {
            result: (await handlers.sendMessage(params)) ?? null,
          });
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
            result: (await handlers.updateModelContext(params)) ?? null,
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
            !VALID_DISPLAY_MODES.includes(modeParams.mode as McpAppDisplayMode)
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
              mode: modeParams.mode as McpAppDisplayMode,
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
      const error = err instanceof Error ? err : new Error(String(err));
      handlers.onError?.(error);
      errorResponse(req.id, JSONRPC_ERROR.internalError, error.message);
    }
  };

  const handleNotification = (note: McpAppJsonRpcNotification) => {
    switch (normalizeMethod(note.method)) {
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
      post({
        jsonrpc: "2.0",
        method: "ui/notifications/tool-input",
        params: isRecord(input) ? { arguments: input } : {},
      });
    },
    notifyToolResult: (result: unknown) => {
      post({
        jsonrpc: "2.0",
        method: "notifications/tools/call/result",
        params: { result },
      });
      post({
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: isRecord(result)
          ? result
          : { content: [{ type: "text", text: String(result) }] },
      });
    },
    notifyHostContextChanged: (ctx: McpAppHostContext) => {
      post({
        jsonrpc: "2.0",
        method: "notifications/host_context/changed",
        params: ctx,
      });
      post({
        jsonrpc: "2.0",
        method: "ui/notifications/host-context-changed",
        params: ctx,
      });
    },
  };
}
