/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UniversalProvider, usePlatform } from "./provider";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const bridgeMocks = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => void>(),
}));

vi.mock("../platforms/mcp/bridge", () => {
  class MCPBridge {
    connect = bridgeMocks.connect;
    disconnect = bridgeMocks.disconnect;
  }

  return { MCPBridge };
});

vi.mock("../extensions/chatgpt", () => ({
  withChatGPTExtensions: (bridge: unknown) => bridge,
}));

function PlatformProbe() {
  return <div data-testid="platform">{usePlatform()}</div>;
}

function render() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

describe("UniversalProvider behavior", () => {
  beforeEach(() => {
    bridgeMocks.connect.mockReset();
    bridgeMocks.disconnect.mockReset();
    delete (
      window as Window &
        typeof globalThis & {
          __MCP_HOST__?: boolean;
        }
    ).__MCP_HOST__;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders immediately in non-host environments without attempting connect", async () => {
    bridgeMocks.connect.mockImplementation(() => new Promise<void>(() => {}));

    const { container, root } = render();

    try {
      await act(async () => {
        root.render(
          <UniversalProvider>
            <PlatformProbe />
          </UniversalProvider>,
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(
        container.querySelector("[data-testid='platform']")?.textContent,
      ).toBe("unknown");
      expect(bridgeMocks.connect).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("connects and reports mcp when host markers are present", async () => {
    (
      window as Window &
        typeof globalThis & {
          __MCP_HOST__?: boolean;
        }
    ).__MCP_HOST__ = true;
    bridgeMocks.connect.mockResolvedValue();

    const { container, root } = render();

    try {
      await act(async () => {
        root.render(
          <UniversalProvider>
            <PlatformProbe />
          </UniversalProvider>,
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(
        container.querySelector("[data-testid='platform']")?.textContent,
      ).toBe("mcp");
      expect(bridgeMocks.connect).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
