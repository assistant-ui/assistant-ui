import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

const h = vi.hoisted(() => ({ announce: vi.fn() }));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();

  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      announceForAccessibility: h.announce,
    },
  };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon = (name: string) => () =>
    React.createElement(View, { testID: name });

  return {
    CircleAlertIcon: icon("CircleAlertIcon"),
    RefreshCwIcon: icon("RefreshCwIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("ErrorState", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it("announces the failure and retries on press", async () => {
    const onRetry = vi.fn();
    await act(async () => {
      root.render(
        <ErrorState
          title="Connection lost"
          detail="The stream ended before the reply finished."
          retrying={false}
          onRetry={onRetry}
        />,
      );
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute("aria-live")).toBe("polite");
    expect(alert?.textContent).toContain("Connection lost");
    expect(alert?.textContent).toContain(
      "The stream ended before the reply finished.",
    );
    expect(
      container.querySelector('[data-testid="CircleAlertIcon"]'),
    ).not.toBeNull();

    await act(async () => {
      click(container.querySelector('[aria-label="Retry"]') as Element);
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("announces the failure when it appears and the retry when it starts", async () => {
    const onRetry = vi.fn();
    await act(async () => {
      root.render(
        <ErrorState
          title="Connection lost"
          detail="The stream ended."
          retrying={false}
          onRetry={onRetry}
        />,
      );
    });
    expect(h.announce).toHaveBeenCalledWith(
      "Connection lost. The stream ended.",
    );

    await act(async () => {
      root.render(
        <ErrorState
          title="Connection lost"
          detail="The stream ended."
          retrying
          onRetry={onRetry}
        />,
      );
    });
    expect(h.announce).toHaveBeenLastCalledWith("Retrying");
    expect(h.announce).toHaveBeenCalledTimes(2);
  });

  it("shows the retrying state without a retry button", async () => {
    await act(async () => {
      root.render(
        <ErrorState
          title="Connection lost"
          detail="unused"
          retrying
          onRetry={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[aria-label="Retrying"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Retry"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("Retrying");
  });
});
