// @vitest-environment jsdom
import { act, startTransition, Suspense } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SandboxBridge,
  SandboxHostProps,
} from "../sandbox-host/SandboxHost";
import type { CreateMcpAppBridgeOptions, McpAppBridge } from "./bridge";
import type * as BridgeModule from "./bridge";
import { MCP_APP_MIME_TYPE, type McpAppHostContext } from "./types";

const { sandboxHostMock, createMcpAppBridgeMock } = vi.hoisted(() => ({
  sandboxHostMock: vi.fn(),
  createMcpAppBridgeMock: vi.fn(),
}));

vi.mock("../sandbox-host/SandboxHost", () => ({
  SandboxHost: sandboxHostMock,
}));

vi.mock("./bridge", async (importOriginal) => ({
  ...(await importOriginal()),
  createMcpAppBridge: createMcpAppBridgeMock,
}));

import { McpAppFrame } from "./app-frame";

describe("McpAppFrame", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps bridge options scoped to committed renders", async () => {
    let committedCreateBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      committedCreateBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);
    const callToolA = vi.fn();
    const callToolB = vi.fn();
    const interruptedRender = vi.fn();
    const pending = new Promise<never>(() => {});
    const Block = () => {
      interruptedRender();
      throw pending;
    };
    const view = (
      workspace: string,
      callTool: typeof callToolA,
      blocked: boolean,
    ) => (
      <Suspense fallback={null}>
        <McpAppFrame
          app={{ resourceUri: "ui://example/widget" }}
          resource={{
            uri: "ui://example/widget",
            mimeType: MCP_APP_MIME_TYPE,
            html: "",
          }}
          handlers={{ callTool }}
          hostContext={{ workspace }}
        />
        {blocked ? <Block /> : null}
      </Suspense>
    );
    const rendered = render(view("workspace-a", callToolA, false));

    act(() => {
      startTransition(() =>
        rendered.rerender(view("workspace-b", callToolB, true)),
      );
    });
    expect(interruptedRender).toHaveBeenCalled();
    expect(committedCreateBridge).not.toBeNull();

    const sandboxBridge: SandboxBridge = committedCreateBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );
    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;
    expect(options.hostContext).toEqual({ workspace: "workspace-a" });
    await options.handlers?.callTool?.({ name: "search" });
    expect(callToolA).toHaveBeenCalledOnce();
    expect(callToolB).not.toHaveBeenCalled();

    sandboxBridge.dispose();
  });

  it.each([
    { initial: [], next: ["search"], allowed: true },
    { initial: ["search"], next: [], allowed: false },
    { initial: undefined, next: ["other"], allowed: false },
    { initial: [], next: undefined, allowed: true },
  ])(
    "applies replacement tool allowlists: $initial -> $next",
    async ({ initial, next, allowed }) => {
      const { createMcpAppBridge } =
        await vi.importActual<typeof BridgeModule>("./bridge");
      createMcpAppBridgeMock.mockImplementationOnce(createMcpAppBridge);
      const captured: { createBridge?: SandboxHostProps["createBridge"] } = {};
      sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
        captured.createBridge ??= props.createBridge;
        return null;
      });
      const callTool = vi.fn(() => ({ content: [] }));
      const view = (allowedTools: readonly string[] | undefined) => (
        <McpAppFrame
          app={{ resourceUri: "ui://example/widget" }}
          resource={{
            uri: "ui://example/widget",
            mimeType: MCP_APP_MIME_TYPE,
            html: "",
          }}
          handlers={
            allowedTools === undefined
              ? { callTool }
              : { allowedTools, callTool }
          }
        />
      );
      const rendered = render(view(initial));
      if (!captured.createBridge) throw new Error("Frame did not mount");
      const sendMessage = vi.fn();
      const bridge = captured.createBridge(
        {
          iframe: document.createElement("iframe"),
          origin: "https://widget.example",
          sendMessage,
        },
        { setHeight: vi.fn() },
      );
      try {
        rendered.rerender(view(next));
        bridge.onMessage(
          new MessageEvent("message", {
            data: {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name: "search" },
            },
          }),
        );
        await Promise.resolve();
        expect(sendMessage).toHaveBeenCalledWith(
          expect.objectContaining(
            allowed
              ? { id: 1, result: { content: [] } }
              : { id: 1, error: expect.objectContaining({ code: -32602 }) },
          ),
        );
        expect(callTool).toHaveBeenCalledTimes(allowed ? 1 : 0);
      } finally {
        bridge.dispose();
      }
    },
  );

  it("forwards size changes to the sandbox host and live handler", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);
    const initialOnSizeChange = vi.fn();
    const replacementOnSizeChange = vi.fn();
    const view = (onSizeChange: typeof initialOnSizeChange) => (
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
        handlers={{ onSizeChange }}
      />
    );
    const rendered = render(view(initialOnSizeChange));

    const setHeight = vi.fn();
    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight },
    );
    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;

    try {
      const initialSize = { width: 640, height: 360 };
      options.handlers?.onSizeChange?.(initialSize);
      expect(setHeight).toHaveBeenCalledWith(360);
      expect(initialOnSizeChange).toHaveBeenCalledWith(initialSize);

      rendered.rerender(view(replacementOnSizeChange));
      const replacementSize = { width: 800, height: 480 };
      options.handlers?.onSizeChange?.(replacementSize);
      expect(setHeight).toHaveBeenNthCalledWith(2, 480);
      expect(initialOnSizeChange).toHaveBeenCalledOnce();
      expect(replacementOnSizeChange).toHaveBeenCalledOnce();
      expect(replacementOnSizeChange).toHaveBeenCalledWith(replacementSize);

      const widthOnlySize = { width: 720 };
      options.handlers?.onSizeChange?.(widthOnlySize);
      expect(setHeight).toHaveBeenCalledTimes(2);
      expect(replacementOnSizeChange).toHaveBeenCalledWith(widthOnlySize);
    } finally {
      sandboxBridge.dispose();
    }
  });

  it("disposes the underlying bridge with the sandbox bridge", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);
    render(
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
      />,
    );

    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );
    sandboxBridge.dispose();

    expect(bridge.dispose).toHaveBeenCalledOnce();
  });

  it("only notifies the widget when host context actually changes", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);

    const view = (hostContext: McpAppHostContext) => (
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
        hostContext={hostContext}
      />
    );
    const rendered = render(
      view({ displayMode: "inline", availableDisplayModes: ["inline", "pip"] }),
    );

    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );
    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;
    options.handlers?.onInitialized?.();

    rendered.rerender(
      view({ displayMode: "inline", availableDisplayModes: ["inline", "pip"] }),
    );
    expect(bridge.notifyHostContextChanged).not.toHaveBeenCalled();

    rendered.rerender(
      view({
        displayMode: "fullscreen",
        availableDisplayModes: ["inline", "pip"],
      }),
    );
    expect(bridge.notifyHostContextChanged).toHaveBeenCalledTimes(1);
    expect(bridge.notifyHostContextChanged).toHaveBeenCalledWith({
      displayMode: "fullscreen",
      availableDisplayModes: ["inline", "pip"],
    });

    sandboxBridge.dispose();
  });
  it("cancels a queued host context that returns to the delivered value", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);

    const view = (hostContext: McpAppHostContext) => (
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
        hostContext={hostContext}
      />
    );
    const rendered = render(view({ displayMode: "inline" }));

    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );

    rendered.rerender(view({ displayMode: "fullscreen" }));
    rendered.rerender(view({ displayMode: "inline" }));

    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;
    options.handlers?.onInitialized?.();

    expect(bridge.notifyHostContextChanged).not.toHaveBeenCalled();

    sandboxBridge.dispose();
  });

  it("treats an equal host context as unchanged when it is not strict JSON", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);

    const view = () => (
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
        hostContext={{ displayMode: "inline", workspace: undefined }}
      />
    );
    const rendered = render(view());

    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );
    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;
    options.handlers?.onInitialized?.();

    rendered.rerender(view());
    expect(bridge.notifyHostContextChanged).not.toHaveBeenCalled();

    sandboxBridge.dispose();
  });
  it("notifies when a context value changes behind an unchanged key set", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);

    const view = (updatedAt: Date) => (
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
        hostContext={{ updatedAt }}
      />
    );
    const rendered = render(view(new Date(1)));

    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );
    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;
    options.handlers?.onInitialized?.();

    rendered.rerender(view(new Date(2)));
    expect(bridge.notifyHostContextChanged).toHaveBeenCalledTimes(1);

    sandboxBridge.dispose();
  });

  it("does not repeat the empty context the bridge already delivered", () => {
    let createBridge: SandboxHostProps["createBridge"] | null = null;
    sandboxHostMock.mockImplementation((props: SandboxHostProps) => {
      createBridge ??= props.createBridge;
      return null;
    });
    const bridge: McpAppBridge = {
      onMessage: vi.fn(),
      dispose: vi.fn(),
      notifyToolInput: vi.fn(),
      notifyToolResult: vi.fn(),
      notifyHostContextChanged: vi.fn(),
    };
    createMcpAppBridgeMock.mockReturnValue(bridge);

    const view = (hostContext?: McpAppHostContext) => (
      <McpAppFrame
        app={{ resourceUri: "ui://example/widget" }}
        resource={{
          uri: "ui://example/widget",
          mimeType: MCP_APP_MIME_TYPE,
          html: "",
        }}
        {...(hostContext === undefined ? {} : { hostContext })}
      />
    );
    const rendered = render(view());

    const sandboxBridge = createBridge!(
      {
        iframe: document.createElement("iframe"),
        origin: "https://widget.example",
        sendMessage: vi.fn(),
      },
      { setHeight: vi.fn() },
    );
    const options = createMcpAppBridgeMock.mock
      .calls[0]![0] as CreateMcpAppBridgeOptions;
    options.handlers?.onInitialized?.();

    rendered.rerender(view({}));
    expect(bridge.notifyHostContextChanged).not.toHaveBeenCalled();

    sandboxBridge.dispose();
  });
});
