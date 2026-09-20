import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const domProps = ({
    accessibilityLabel,
    accessibilityRole,
    children,
    className,
    disabled,
    onPress,
    style: _style,
    ...props
  }: any) => ({
    ...props,
    "aria-disabled": disabled ? "true" : undefined,
    "aria-label": accessibilityLabel,
    className,
    disabled,
    onClick: onPress,
    role: accessibilityRole,
  });
  const View = (props: any) =>
    React.createElement("div", domProps(props), props.children);
  const Pressable = (props: any) =>
    React.createElement("button", domProps(props), props.children);
  const Text = (props: any) =>
    React.createElement("span", domProps(props), props.children);

  return { ...actual, Animated: { View }, Pressable, Text, View };
});

vi.mock("uniwind", async (importOriginal) => ({
  ...(await importOriginal<typeof import("uniwind")>()),
  withUniwind: (Component: unknown) => Component,
}));

vi.mock("lucide-react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react-native")>();
  const React = await import("react");
  const icon = (name: string) => () =>
    React.createElement("svg", { "data-testid": name });

  return {
    ...actual,
    BanIcon: icon("BanIcon"),
    CheckIcon: icon("CheckIcon"),
    ChevronDownIcon: icon("ChevronDownIcon"),
    ChevronRightIcon: icon("ChevronRightIcon"),
    XIcon: icon("XIcon"),
  };
});

vi.mock("./surfaces", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./surfaces")>()),
  usePulse: () => 1,
}));

import { TaskCard, TaskStateIcon } from "./task-card";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("TaskCard", () => {
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

  const render = async (
    props: Partial<React.ComponentProps<typeof TaskCard>> = {},
  ) => {
    await act(async () => {
      root.render(
        <TaskCard label="Explore the runtime" state="working" {...props} />,
      );
    });
  };

  const header = () =>
    container.querySelector(
      '[aria-label="Explore the runtime, working"]',
    ) as HTMLButtonElement;

  it("labels the header and makes a transcript-less card disabled", async () => {
    await render();

    expect(header()).not.toBeNull();
    expect(header().getAttribute("aria-disabled")).toBe("true");
    expect(header().getAttribute("aria-expanded")).toBeNull();

    await act(async () => {
      click(header());
    });
    expect(container.querySelector(".aui-task-card-transcript")).toBeNull();
  });

  it("toggles the transcript when it has children", async () => {
    await render({ children: <span>Nested transcript</span> });

    expect(header().getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Nested transcript");

    await act(async () => {
      click(header());
    });
    expect(header().getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Nested transcript");

    await act(async () => {
      click(header());
    });
    expect(header().getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Nested transcript");
  });

  it("leaves a controlled card inert without its change handler", async () => {
    await render({ open: false, children: <span>Nested transcript</span> });

    expect(header().getAttribute("aria-disabled")).toBe("true");
    await act(async () => {
      click(header());
    });
    expect(header().getAttribute("aria-expanded")).toBe("false");
  });

  it("notifies controlled cards with the next value", async () => {
    const onOpenChange = vi.fn();
    await render({
      open: false,
      onOpenChange,
      children: <span>Nested transcript</span>,
    });

    await act(async () => {
      click(header());
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it.each([null, false, undefined] as const)(
    "omits non-renderable action and result sections for %s",
    async (value) => {
      await render({ actions: value, result: value });

      expect(container.querySelector(".aui-task-card-actions")).toBeNull();
      expect(container.querySelector(".aui-task-card-result")).toBeNull();
    },
  );

  it("renders metadata, elapsed time, actions, and results", async () => {
    await render({
      actions: <span>Actions</span>,
      elapsed: "3.4s",
      meta: "researcher",
      result: <span>Result</span>,
    });

    expect(container.textContent).toContain("researcher");
    expect(container.textContent).toContain("3.4s");
    expect(container.querySelector(".aui-task-card-actions")?.textContent).toBe(
      "Actions",
    );
    expect(container.querySelector(".aui-task-card-result")?.textContent).toBe(
      "Result",
    );
  });
});

describe("TaskStateIcon", () => {
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

  it.each([
    ["done", "CheckIcon"],
    ["failed", "XIcon"],
    ["cancelled", "BanIcon"],
  ] as const)("renders %s with %s", async (state, icon) => {
    await act(async () => {
      root.render(<TaskStateIcon state={state} />);
    });

    expect(container.querySelector(`[data-testid="${icon}"]`)).not.toBeNull();
  });

  it.each(["working", "waiting"] as const)(
    "renders %s as a dot",
    async (state) => {
      await act(async () => {
        root.render(<TaskStateIcon state={state} />);
      });

      expect(container.querySelector(".rounded-full")).not.toBeNull();
    },
  );
});
