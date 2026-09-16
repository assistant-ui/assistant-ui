import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHydrated, useMotion } from "./surfaces";

const h = vi.hoisted(() => ({
  resolvers: [] as Array<(reduced: boolean) => void>,
  handler: undefined as ((reduced: boolean) => void) | undefined,
  subscribe: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();

  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: () =>
        new Promise<boolean>((resolve) => {
          h.resolvers.push(resolve);
        }),
      addEventListener: (
        _event: string,
        handler: (reduced: boolean) => void,
      ) => {
        h.subscribe();
        h.handler = handler;
        return { remove: h.remove };
      },
    },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const Probe = () => <Text>{useMotion() ? "motion" : "still"}</Text>;
const HydrationProbe = () => <div>{useHydrated() ? "hydrated" : "server"}</div>;

describe("useMotion", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.resolvers.length = 0;
    h.handler = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const answer = async (index: number, reduced: boolean) => {
    await act(async () => {
      h.resolvers[index]?.(reduced);
    });
  };

  it("stays still until the setting is known, then follows changes", async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    expect(container.textContent).toBe("still");

    await answer(0, false);
    expect(container.textContent).toBe("motion");

    await act(async () => {
      h.handler?.(true);
    });
    expect(container.textContent).toBe("still");
  });

  it("shares one subscription and closes it after the last consumer", async () => {
    await act(async () => {
      root.render(
        <>
          <Probe />
          <Probe />
        </>,
      );
    });
    await answer(0, false);

    expect(h.subscribe).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("motionmotion");

    await act(async () => {
      root.unmount();
    });
    expect(h.remove).toHaveBeenCalledTimes(1);

    root = createRoot(container);
  });

  it("ignores a query that resolves after the last consumer left", async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await act(async () => {
      root.render(<Probe />);
    });

    await answer(0, false);
    expect(container.textContent).toBe("still");

    await answer(1, false);
    expect(container.textContent).toBe("motion");
  });
});

describe("useHydrated", () => {
  it("uses the server snapshot during SSR and updates after hydration", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<HydrationProbe />);
    const serverNode = container.firstElementChild;
    expect(container.textContent).toBe("server");

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root = hydrateRoot(container, <HydrationProbe />);
    await act(async () => {});

    expect(container.textContent).toBe("hydrated");
    expect(container.firstElementChild).toBe(serverNode);
    expect(consoleError).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
    consoleError.mockRestore();
    container.remove();
  });
});
