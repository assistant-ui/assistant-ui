// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode, act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

const { tracked } = vi.hoisted(() => ({
  tracked: { constructions: 0, disposed: 0 },
}));

vi.mock("./AcpClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./AcpClient")>();
  class TrackedAcpClient extends actual.AcpClient {
    constructor(options: ConstructorParameters<typeof actual.AcpClient>[0]) {
      super(options);
      tracked.constructions += 1;
    }
    override dispose(): void {
      tracked.disposed += 1;
      super.dispose();
    }
  }
  return { ...actual, AcpClient: TrackedAcpClient };
});

import { AcpClient } from "./AcpClient";
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

  it("throws when neither client nor url is provided", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderRuntime({ autoConnect: false } as never)).toThrow(
      "useAcpRuntime requires either `client` or `url`",
    );
    errorSpy.mockRestore();
  });
});
