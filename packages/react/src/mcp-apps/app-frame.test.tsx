// @vitest-environment jsdom
import { act, startTransition, Suspense } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SandboxBridge,
  SandboxHostProps,
} from "../sandbox-host/SandboxHost";
import type { CreateMcpAppBridgeOptions, McpAppBridge } from "./bridge";
import { MCP_APP_MIME_TYPE } from "./types";

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
});
