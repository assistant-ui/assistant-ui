/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MCPProvider } from "./hooks";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const bridgeMocks = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => void>(),
}));

vi.mock("./bridge", () => {
  class MCPBridge {
    connect = bridgeMocks.connect;
    disconnect = bridgeMocks.disconnect;
  }

  return { MCPBridge };
});

function render() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

describe("MCPProvider behavior", () => {
  beforeEach(() => {
    bridgeMocks.connect.mockReset();
    bridgeMocks.disconnect.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("handles connect rejection without unhandled promise errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const unhandledRejections: PromiseRejectionEvent[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      unhandledRejections.push(event);
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    bridgeMocks.connect.mockRejectedValue(new Error("host unavailable"));

    const { container, root } = render();

    try {
      await act(async () => {
        root.render(
          <MCPProvider>
            <div data-testid="content">content</div>
          </MCPProvider>,
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(errorSpy).toHaveBeenCalled();
      expect(unhandledRejections).toHaveLength(0);
      expect(
        container.querySelector("[data-testid='content']")?.textContent,
      ).toBe("content");
    } finally {
      window.removeEventListener("unhandledrejection", onUnhandled);
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("renders children after successful connect", async () => {
    bridgeMocks.connect.mockResolvedValue();

    const { container, root } = render();

    try {
      await act(async () => {
        root.render(
          <MCPProvider>
            <div data-testid="content">content</div>
          </MCPProvider>,
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(
        container.querySelector("[data-testid='content']")?.textContent,
      ).toBe("content");
      expect(bridgeMocks.connect).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
