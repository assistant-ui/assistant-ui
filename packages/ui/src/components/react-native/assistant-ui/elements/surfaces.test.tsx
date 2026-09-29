import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { useHydrated, useMotion } from "./surfaces";

const h = vi.hoisted(() => ({
  hydrationRenders: [] as boolean[],
  resolvers: [] as Array<(reduced: boolean) => void>,
  rejecters: [] as Array<(error: Error) => void>,
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
        new Promise<boolean>((resolve, reject) => {
          h.resolvers.push(resolve);
          h.rejecters.push(reject);
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

describe("useMotion", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.resolvers.length = 0;
    h.rejecters.length = 0;
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

  const reject = async (index: number, error: Error) => {
    await act(async () => {
      h.rejecters[index]?.(error);
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

  it("keeps motion disabled when the initial setting query rejects", async () => {
    await act(async () => {
      root.render(<Probe />);
    });

    await reject(0, new Error("setting unavailable"));
    expect(container.textContent).toBe("still");

    await act(async () => {
      h.handler?.(false);
    });
    expect(container.textContent).toBe("motion");
  });
});

const HydrationProbe = () => {
  const hydrated = useHydrated();
  h.hydrationRenders.push(hydrated);
  return <Text>{hydrated ? "hydrated" : "server"}</Text>;
};

describe("useHydrated", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    h.hydrationRenders.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
  });

  it("matches the server render while hydrating, then reports hydrated", async () => {
    container.innerHTML = renderToString(<HydrationProbe />);
    const serverText = container.querySelector("div[dir]");
    expect(serverText?.textContent).toBe("server");
    expect(h.hydrationRenders).toEqual([false]);

    const consoleError = vi.spyOn(console, "error");
    onTestFinished(() => consoleError.mockRestore());
    await act(async () => {
      root = hydrateRoot(container, <HydrationProbe />);
    });

    const clientRenders = h.hydrationRenders.slice(1);
    expect(clientRenders.length).toBeGreaterThan(1);
    expect(clientRenders.slice(0, -1)).not.toContain(true);
    expect(clientRenders.at(-1)).toBe(true);
    const text = container.querySelector("div[dir]");
    expect(text?.textContent).toBe("hydrated");
    expect(text).toBe(serverText);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("is hydrated from the first client-only render", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<HydrationProbe />);
    });

    expect(h.hydrationRenders).toEqual([true]);
    expect(container.textContent).toBe("hydrated");
  });
});
