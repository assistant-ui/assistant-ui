// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createMcpAppBridge, type McpAppBridgeFrame } from "./bridge";
import type {
  McpAppJsonRpcMessage,
  McpAppJsonRpcRequest,
  McpAppJsonRpcResponse,
} from "./types";
import { MCP_APP_PROTOCOL_VERSION } from "./types";

type Captured = McpAppJsonRpcMessage;

function makeFrame() {
  const captured: Captured[] = [];
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const frame: McpAppBridgeFrame = {
    iframe,
    origin: "https://app.example",
    sendMessage: (data) => {
      captured.push(data as Captured);
    },
  };
  return { frame, captured };
}

function dispatch(frame: McpAppBridgeFrame, message: McpAppJsonRpcMessage) {
  const event = new MessageEvent("message", {
    data: message,
    origin: frame.origin,
    source: frame.iframe.contentWindow,
  });
  window.dispatchEvent(event);
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("createMcpAppBridge", () => {
  it("responds to ui/initialize with host info, version, and capabilities", async () => {
    const { frame, captured } = makeFrame();
    const bridge = createMcpAppBridge({
      frame,
      hostInfo: { name: "test-host", version: "9.9.9" },
      hostContext: { theme: "dark" },
      handlers: {
        callTool: vi.fn(),
        sendMessage: vi.fn(),
      },
    });

    const req: McpAppJsonRpcRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "ui/initialize",
    };
    dispatch(frame, req);
    await flush();

    expect(captured).toHaveLength(1);
    const res = captured[0] as McpAppJsonRpcResponse;
    expect(res.id).toBe(1);
    const result = res.result as Record<string, any>;
    expect(result["protocolVersion"]).toBe(MCP_APP_PROTOCOL_VERSION);
    expect(result["host"]).toEqual({ name: "test-host", version: "9.9.9" });
    expect(result["hostContext"]).toEqual({ theme: "dark" });
    expect(result["capabilities"]["tools"]).toBeDefined();
    expect(result["capabilities"]["ui"]["sendMessage"]).toBe(true);
    expect(result["capabilities"]["ui"]["openLink"]).toBe(false);

    bridge.dispose();
  });

  it("routes tools/call to handler", async () => {
    const { frame, captured } = makeFrame();
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    const bridge = createMcpAppBridge({ frame, handlers: { callTool } });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "search", arguments: { q: "hi" } },
    });
    await flush();

    expect(callTool).toHaveBeenCalledWith({
      name: "search",
      arguments: { q: "hi" },
    });
    expect(captured[0]).toEqual({
      jsonrpc: "2.0",
      id: 7,
      result: { ok: true },
    });
    bridge.dispose();
  });

  it("rejects tools/call for disallowed tool with -32602", async () => {
    const { frame, captured } = makeFrame();
    const callTool = vi.fn();
    const bridge = createMcpAppBridge({
      frame,
      handlers: { callTool, allowedTools: ["search"] },
    });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "delete_everything" },
    });
    await flush();

    expect(callTool).not.toHaveBeenCalled();
    const res = captured[0] as McpAppJsonRpcResponse;
    expect(res.error?.code).toBe(-32602);
    bridge.dispose();
  });

  it("returns -32601 when no callTool handler", async () => {
    const { frame, captured } = makeFrame();
    const bridge = createMcpAppBridge({ frame });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "x" },
    });
    await flush();

    const res = captured[0] as McpAppJsonRpcResponse;
    expect(res.error?.code).toBe(-32601);
    bridge.dispose();
  });

  it("rejects tools/call with non-object arguments via -32602", async () => {
    const { frame, captured } = makeFrame();
    const callTool = vi.fn();
    const bridge = createMcpAppBridge({ frame, handlers: { callTool } });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: { name: "x", arguments: "not-an-object" },
    });
    await flush();

    expect(callTool).not.toHaveBeenCalled();
    expect((captured[0] as McpAppJsonRpcResponse).error?.code).toBe(-32602);
    bridge.dispose();
  });

  it("rejects requestDisplayMode with unknown mode via -32602", async () => {
    const { frame, captured } = makeFrame();
    const requestDisplayMode = vi.fn();
    const bridge = createMcpAppBridge({
      frame,
      handlers: { requestDisplayMode },
    });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 13,
      method: "requestDisplayMode",
      params: { mode: "sidebar" },
    });
    await flush();

    expect(requestDisplayMode).not.toHaveBeenCalled();
    expect((captured[0] as McpAppJsonRpcResponse).error?.code).toBe(-32602);
    bridge.dispose();
  });

  it("rejects openLink for non-http(s) schemes via -32602", async () => {
    const { frame, captured } = makeFrame();
    const openLink = vi.fn();
    const bridge = createMcpAppBridge({ frame, handlers: { openLink } });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 12,
      method: "openLink",
      params: { url: "javascript:alert(1)" },
    });
    await flush();

    expect(openLink).not.toHaveBeenCalled();
    expect((captured[0] as McpAppJsonRpcResponse).error?.code).toBe(-32602);
    bridge.dispose();
  });

  it("invokes onSizeChange / onInitialized for notifications", () => {
    const { frame } = makeFrame();
    const onSizeChange = vi.fn();
    const onInitialized = vi.fn();
    const bridge = createMcpAppBridge({
      frame,
      handlers: { onSizeChange, onInitialized },
    });

    dispatch(frame, {
      jsonrpc: "2.0",
      method: "notifications/size_changed",
      params: { width: 320, height: 240 },
    });
    dispatch(frame, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    expect(onSizeChange).toHaveBeenCalledWith({ width: 320, height: 240 });
    expect(onInitialized).toHaveBeenCalled();
    bridge.dispose();
  });

  it("notifyToolInput / notifyToolResult / notifyHostContextChanged post correct notifications", () => {
    const { frame, captured } = makeFrame();
    const bridge = createMcpAppBridge({ frame });

    bridge.notifyToolInput({ a: 1 });
    bridge.notifyToolResult({ ok: 1 });
    bridge.notifyHostContextChanged({ theme: "light" });

    expect(captured).toEqual([
      {
        jsonrpc: "2.0",
        method: "notifications/tools/call/input",
        params: { input: { a: 1 } },
      },
      {
        jsonrpc: "2.0",
        method: "notifications/tools/call/result",
        params: { result: { ok: 1 } },
      },
      {
        jsonrpc: "2.0",
        method: "notifications/host_context/changed",
        params: { theme: "light" },
      },
    ]);
    bridge.dispose();
  });

  it("routes resources/read and resources/list to handlers", async () => {
    const { frame, captured } = makeFrame();
    const readResource = vi.fn().mockResolvedValue({ contents: [] });
    const listResources = vi.fn().mockResolvedValue({ resources: [] });
    const bridge = createMcpAppBridge({
      frame,
      handlers: { readResource, listResources },
    });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 20,
      method: "resources/read",
      params: { uri: "ui://app/x" },
    });
    dispatch(frame, {
      jsonrpc: "2.0",
      id: 21,
      method: "resources/list",
    });
    await flush();

    expect(readResource).toHaveBeenCalledWith({ uri: "ui://app/x" });
    expect(listResources).toHaveBeenCalled();
    expect(captured.map((c) => (c as McpAppJsonRpcResponse).id)).toEqual([
      20, 21,
    ]);
  });

  it("returns -32601 for resources/read and resources/list when no handler", async () => {
    const { frame, captured } = makeFrame();
    const bridge = createMcpAppBridge({ frame });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 22,
      method: "resources/read",
      params: { uri: "ui://x" },
    });
    dispatch(frame, { jsonrpc: "2.0", id: 23, method: "resources/list" });
    await flush();

    expect((captured[0] as McpAppJsonRpcResponse).error?.code).toBe(-32601);
    expect((captured[1] as McpAppJsonRpcResponse).error?.code).toBe(-32601);
    bridge.dispose();
  });

  it("routes sendMessage and updateModelContext to handlers", async () => {
    const { frame, captured } = makeFrame();
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const updateModelContext = vi.fn().mockResolvedValue({ ok: true });
    const bridge = createMcpAppBridge({
      frame,
      handlers: { sendMessage, updateModelContext },
    });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 30,
      method: "sendMessage",
      params: { text: "hi" },
    });
    dispatch(frame, {
      jsonrpc: "2.0",
      id: 31,
      method: "updateModelContext",
      params: { foo: "bar" },
    });
    await flush();

    expect(sendMessage).toHaveBeenCalledWith({ text: "hi" });
    expect(updateModelContext).toHaveBeenCalledWith({ foo: "bar" });
    expect(captured.map((c) => (c as McpAppJsonRpcResponse).id)).toEqual([
      30, 31,
    ]);
    bridge.dispose();
  });

  it("invokes onLog / onError / onRequestTeardown for notifications", () => {
    const { frame } = makeFrame();
    const onLog = vi.fn();
    const onError = vi.fn();
    const onRequestTeardown = vi.fn();
    const bridge = createMcpAppBridge({
      frame,
      handlers: { onLog, onError, onRequestTeardown },
    });

    dispatch(frame, {
      jsonrpc: "2.0",
      method: "notifications/log",
      params: { level: "info", message: "hello" },
    });
    dispatch(frame, {
      jsonrpc: "2.0",
      method: "notifications/error",
      params: { message: "kaboom" },
    });
    dispatch(frame, {
      jsonrpc: "2.0",
      method: "notifications/request_teardown",
      params: { reason: "done" },
    });

    expect(onLog).toHaveBeenCalledWith({ level: "info", message: "hello" });
    expect(onError).toHaveBeenCalled();
    expect(onRequestTeardown).toHaveBeenCalledWith({ reason: "done" });
    bridge.dispose();
  });

  it("ignores messages from wrong origin or wrong source", async () => {
    const { frame, captured } = makeFrame();
    const callTool = vi.fn();
    const bridge = createMcpAppBridge({ frame, handlers: { callTool } });

    const msg: McpAppJsonRpcMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "search" },
    };

    window.dispatchEvent(
      new MessageEvent("message", {
        data: msg,
        origin: "https://attacker.example",
        source: frame.iframe.contentWindow,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        data: msg,
        origin: frame.origin,
        source: window,
      }),
    );
    await flush();

    expect(callTool).not.toHaveBeenCalled();
    expect(captured).toHaveLength(0);
    bridge.dispose();
  });
});
