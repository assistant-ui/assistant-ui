// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode, act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

const { tracked } = vi.hoisted(() => ({
  tracked: {
    constructions: 0,
    disposed: 0,
    teardown: [] as string[],
  },
}));

vi.mock("./AcpClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./AcpClient")>();
  class TrackedAcpClient extends actual.AcpClient {
    constructor(options: ConstructorParameters<typeof actual.AcpClient>[0]) {
      super(options);
      tracked.constructions += 1;
    }
    override async cancel(): Promise<void> {
      tracked.teardown.push("cancel");
      return super.cancel();
    }
    override dispose(): void {
      tracked.disposed += 1;
      tracked.teardown.push("dispose");
      super.dispose();
    }
  }
  return { ...actual, AcpClient: TrackedAcpClient };
});

import type { AssistantRuntime } from "@assistant-ui/core";
import { AcpClient, cancelPermissionHandler } from "./AcpClient";
import { useAcpRuntime } from "./useAcpRuntime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

const renderRuntime = (
  props: Parameters<typeof useAcpRuntime>[0],
  strict = false,
) => {
  const runtimes: unknown[] = [];
  const Probe = (p: Parameters<typeof useAcpRuntime>[0]) => {
    runtimes.push(useAcpRuntime(p));
    return null;
  };
  const container = document.createElement("div");
  root = createRoot(container);
  const element = createElement(Probe, props);
  act(() => {
    root!.render(strict ? createElement(StrictMode, null, element) : element);
  });
  return {
    runtimes,
    rerender(next: Parameters<typeof useAcpRuntime>[0]) {
      const el = createElement(Probe, next);
      act(() => {
        root!.render(strict ? createElement(StrictMode, null, el) : el);
      });
    },
  };
};

const flushTimers = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
};

const baseProps = {
  url: "ws://127.0.0.1:2770/",
  autoConnect: false,
  webSocketFactory: () => {
    throw new Error("not used");
  },
};

afterEach(async () => {
  act(() => root?.unmount());
  root = undefined;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  tracked.constructions = 0;
  tracked.disposed = 0;
  tracked.teardown = [];
  vi.restoreAllMocks();
});

describe("useAcpRuntime", () => {
  it("creates one managed client and disposes it on unmount", async () => {
    renderRuntime(baseProps);
    expect(tracked.constructions).toBe(1);
    expect(tracked.disposed).toBe(0);

    act(() => root?.unmount());
    root = undefined;
    await flushTimers();
    expect(tracked.disposed).toBe(1);
  });

  it("does not dispose the managed client on a StrictMode remount", async () => {
    renderRuntime(baseProps, true);
    await flushTimers();

    expect(tracked.constructions).toBeGreaterThanOrEqual(1);
    expect(tracked.disposed).toBe(0);
  });

  it("never disposes a client the caller owns", async () => {
    const client = new AcpClient({ url: "ws://127.0.0.1:2770/" });
    renderRuntime({ client, autoConnect: false });

    act(() => root?.unmount());
    root = undefined;
    await flushTimers();
    expect(tracked.disposed).toBe(0);
  });

  it("keeps the same client when an inline webSocketFactory changes identity", async () => {
    const { runtimes, rerender } = renderRuntime({
      url: "ws://127.0.0.1:2770/",
      autoConnect: false,
      webSocketFactory: () => {
        throw new Error("not used");
      },
    });
    const first = runtimes.at(-1);

    rerender({
      url: "ws://127.0.0.1:2770/",
      autoConnect: false,
      webSocketFactory: () => {
        throw new Error("also not used");
      },
    });
    await flushTimers();

    expect(tracked.constructions).toBe(1);
    expect(tracked.disposed).toBe(0);
    expect(runtimes.at(-1)).toBe(first);
  });

  it("builds a new client when the url changes", async () => {
    const { rerender } = renderRuntime(baseProps);
    rerender({ ...baseProps, url: "ws://127.0.0.1:2771/" });
    await flushTimers();

    expect(tracked.constructions).toBe(2);
    expect(tracked.disposed).toBe(1);
  });

  it("rebuilds the registry when the client prop changes", async () => {
    const first = new AcpClient({ url: "ws://127.0.0.1:2770/" });
    const second = new AcpClient({ url: "ws://127.0.0.1:2771/" });
    const { rerender } = renderRuntime({ client: first, autoConnect: false });
    await flushTimers();
    expect(first.permissionHandler).not.toBe(cancelPermissionHandler);

    rerender({ client: second, autoConnect: false });
    await flushTimers();

    expect(second.permissionHandler).not.toBe(cancelPermissionHandler);
    expect(first.permissionHandler).toBe(cancelPermissionHandler);
    expect(tracked.disposed).toBe(0);
  });

  it("cancels the remote turn before disposing the managed client", async () => {
    renderRuntime(baseProps);
    await flushTimers();
    tracked.teardown = [];

    act(() => root?.unmount());
    root = undefined;
    await flushTimers();

    expect(tracked.teardown).toEqual(["cancel", "dispose"]);
  });

  it("offers cancel but not edit or reload over a linear ACP session", async () => {
    const { runtimes } = renderRuntime(baseProps);
    await flushTimers();

    const { capabilities } = (
      runtimes.at(-1) as AssistantRuntime
    ).thread.getState();
    expect(capabilities.cancel).toBe(true);
    expect(capabilities.edit).toBe(false);
    expect(capabilities.reload).toBe(false);
  });

  it("throws when neither client nor url is provided", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderRuntime({ autoConnect: false } as never)).toThrow(
      "useAcpRuntime requires either `client` or `url`",
    );
    errorSpy.mockRestore();
  });
});
