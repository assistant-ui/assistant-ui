// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createMCPAppBridge, type MCPAppBridgeFrame } from "./bridge";
import type {
  MCPAppJsonRpcMessage,
  MCPAppJsonRpcRequest,
  MCPAppJsonRpcResponse,
} from "./types";
import { MCP_APP_PROTOCOL_VERSION } from "./types";

type Captured = MCPAppJsonRpcMessage;

function makeFrame() {
  const captured: Captured[] = [];
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const frame: MCPAppBridgeFrame = {
    iframe,
    origin: "https://app.example",
    sendMessage: (data) => {
      captured.push(data as Captured);
    },
  };
  return { frame, captured };
}

function dispatch(frame: MCPAppBridgeFrame, message: MCPAppJsonRpcMessage) {
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

describe("createMCPAppBridge", () => {
  it("responds to ui/initialize with host info, version, and capabilities", async () => {
    const { frame, captured } = makeFrame();
    const bridge = createMCPAppBridge({
      frame,
      hostInfo: { name: "test-host", version: "9.9.9" },
      hostContext: { theme: "dark" },
      handlers: {
        callTool: vi.fn(),
        sendMessage: vi.fn(),
      },
    });

    const req: MCPAppJsonRpcRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "ui/initialize",
    };
    dispatch(frame, req);
    await flush();

    expect(captured).toHaveLength(1);
    const res = captured[0] as MCPAppJsonRpcResponse;
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
    const bridge = createMCPAppBridge({ frame, handlers: { callTool } });

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
    const bridge = createMCPAppBridge({
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
    const res = captured[0] as MCPAppJsonRpcResponse;
    expect(res.error?.code).toBe(-32602);
    bridge.dispose();
  });

  it("returns -32601 when no callTool handler", async () => {
    const { frame, captured } = makeFrame();
    const bridge = createMCPAppBridge({ frame });

    dispatch(frame, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "x" },
    });
    await flush();

    const res = captured[0] as MCPAppJsonRpcResponse;
    expect(res.error?.code).toBe(-32601);
    bridge.dispose();
  });

  it("invokes onSizeChange / onInitialized for notifications", () => {
    const { frame } = makeFrame();
    const onSizeChange = vi.fn();
    const onInitialized = vi.fn();
    const bridge = createMCPAppBridge({
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
    const bridge = createMCPAppBridge({ frame });

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

  it("ignores messages from wrong origin or wrong source", async () => {
    const { frame, captured } = makeFrame();
    const callTool = vi.fn();
    const bridge = createMCPAppBridge({ frame, handlers: { callTool } });

    const msg: MCPAppJsonRpcMessage = {
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
