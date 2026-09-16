import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageQueue } from "./message-queue";

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
    ArrowUpIcon: icon("ArrowUpIcon"),
    XIcon: icon("XIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("MessageQueue", () => {
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

  it("renders the running message and queued rows, then asks to cancel one", async () => {
    const onCancel = vi.fn();
    await act(async () => {
      root.render(
        <MessageQueue
          running="Writing the answer"
          queued={[
            { id: "follow-up", text: "Add an example" },
            { id: "review", text: "Review the result" },
          ]}
          onCancel={onCancel}
        />,
      );
    });

    expect(container.textContent).toContain("Writing the answer");
    expect(container.textContent).toContain("2 queued");
    expect(container.textContent).toContain("sends when this finishes");
    expect(container.textContent).toContain("Add an example");
    expect(container.textContent).toContain("Review the result");
    expect(container.querySelector('[role="list"]')).not.toBeNull();

    await act(async () => {
      click(
        container.querySelector(
          '[aria-label="Remove \\"Add an example\\" from the queue"]',
        ) as Element,
      );
    });

    expect(onCancel).toHaveBeenCalledWith("follow-up");
  });

  it("omits cancel controls when no cancel callback is supplied", async () => {
    await act(async () => {
      root.render(
        <MessageQueue
          running="Writing the answer"
          queued={[{ id: "follow-up", text: "Add an example" }]}
        />,
      );
    });

    expect(
      container.querySelector(
        '[aria-label="Remove \\"Add an example\\" from the queue"]',
      ),
    ).toBeNull();
  });
});
