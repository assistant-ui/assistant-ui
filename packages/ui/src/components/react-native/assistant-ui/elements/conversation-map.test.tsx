import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationMap, type ConversationMapEntry } from "./conversation-map";

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");

  const View = ({
    children,
    className,
    testID,
    accessibilityLabel,
    pointerEvents: _pointerEvents,
    ...props
  }: any) =>
    React.createElement(
      "div",
      {
        ...props,
        className,
        "data-testid": testID,
        "aria-label": accessibilityLabel,
      },
      children,
    );
  const Text = ({
    children,
    className,
    numberOfLines: _lines,
    ...props
  }: any) => React.createElement("span", { ...props, className }, children);
  const Pressable = ({
    children,
    className,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    "aria-current": current,
    "aria-selected": selected,
    hitSlop: _hitSlop,
    delayLongPress: _delayLongPress,
    onPress,
    onLongPress,
    onPressOut,
    onHoverIn,
    onHoverOut,
    onFocus,
    onBlur,
    ...props
  }: any) =>
    React.createElement(
      "button",
      {
        ...props,
        className,
        "aria-label": accessibilityLabel,
        "aria-description": accessibilityHint,
        "aria-current": current,
        "aria-selected": selected,
        role: accessibilityRole,
        onClick: onPress,
        onContextMenu: onLongPress,
        onMouseUp: onPressOut,
        onMouseEnter: onHoverIn,
        onMouseLeave: onHoverOut,
        onFocus,
        onBlur,
      },
      typeof children === "function" ? children({ pressed: false }) : children,
    );

  return { ...actual, Pressable, Text, View };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const ENTRIES: ConversationMapEntry[] = [
  { id: "t1", title: "Chat ready", preview: "the ready dot" },
  { id: "t2", title: "Got it", preview: "I'll use that" },
  { id: "t3", title: "Reload it" },
];

const fire = (element: Element, type: string) => {
  element.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true }),
  );
};

describe("ConversationMap", () => {
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
    props: Partial<Parameters<typeof ConversationMap>[0]> = {},
  ) => {
    await act(async () => {
      root.render(<ConversationMap entries={ENTRIES} {...props} />);
    });
  };

  const ticks = () => Array.from(container.querySelectorAll("button"));
  const bars = () =>
    ticks().map((tick) => tick.firstElementChild!.getAttribute("class")!);
  const tier = (bar: string) =>
    bar.includes("bg-foreground/90")
      ? "read"
      : bar.includes("bg-foreground/50")
        ? "on-screen"
        : "off-screen";

  it("renders one labelled tick per entry with the preview as its hint", async () => {
    await render();

    expect(ticks().map((tick) => tick.getAttribute("aria-label"))).toEqual([
      "Chat ready",
      "Got it",
      "Reload it",
    ]);
    expect(
      ticks().map((tick) => tick.getAttribute("aria-description")),
    ).toEqual(["the ready dot", "I'll use that", null]);
  });

  it("marks only the turn being read as current on web", async () => {
    await render({ activeId: "t2" });

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
    expect(ticks().every((tick) => !tick.hasAttribute("aria-selected"))).toBe(
      true,
    );
    expect(bars().map(tier)).toEqual(["off-screen", "read", "off-screen"]);
    expect(bars()[1]).toContain("h-[3px]");
  });

  it("marks the window separately from the turn being read", async () => {
    await render({ activeId: "t2", visibleIds: ["t2", "t3"] });

    expect(bars().map(tier)).toEqual(["off-screen", "read", "on-screen"]);
  });

  it("keeps the turn being read inside the window", async () => {
    await render({ activeId: "t1", visibleIds: ["t3"] });

    expect(bars().map(tier)).toEqual(["read", "off-screen", "on-screen"]);
  });

  it("reports the selected entry", async () => {
    const onSelect = vi.fn();
    await render({ onSelect });

    await act(async () => {
      fire(ticks()[1]!, "click");
    });

    expect(onSelect).toHaveBeenCalledWith("t2");
  });

  it("keeps preview ticks available without a selection handler", async () => {
    await render();

    expect(ticks()).toHaveLength(ENTRIES.length);
    expect(ticks()[1]!.getAttribute("aria-label")).toBe("Got it");
  });

  it("opens the preview beside the tick while it is hovered or held", async () => {
    await render();
    const preview = () =>
      container.querySelector(".aui-conversation-map-preview");

    expect(preview()).toBeNull();

    await act(async () => {
      fire(ticks()[0]!, "mouseover");
    });
    expect(preview()!.textContent).toBe("Chat readythe ready dot");
    expect(preview()!.getAttribute("class")).toContain("left-full");
    expect(preview()!.getAttribute("class")).toContain("top-0");
    expect(bars()[0]).toContain("w-6");

    await act(async () => {
      fire(ticks()[0]!, "mouseout");
    });
    expect(preview()).toBeNull();
    expect(bars()[0]).toContain("w-3");

    await act(async () => {
      fire(ticks()[2]!, "contextmenu");
    });
    expect(preview()!.textContent).toBe("Reload it");
    expect(preview()!.getAttribute("class")).toContain("bottom-0");

    await act(async () => {
      fire(ticks()[2]!, "mouseup");
    });
    expect(preview()).toBeNull();
  });

  it("opens the preview for the focused tick", async () => {
    await render();
    const preview = () =>
      container.querySelector(".aui-conversation-map-preview");

    await act(async () => {
      ticks()[1]!.focus();
    });
    expect(preview()!.textContent).toBe("Got itI'll use that");

    await act(async () => {
      ticks()[1]!.blur();
    });
    expect(preview()).toBeNull();
  });

  it("keeps the preview open while another interaction still holds it", async () => {
    await render();
    const preview = () =>
      container.querySelector(".aui-conversation-map-preview");

    await act(async () => {
      ticks()[1]!.focus();
      fire(ticks()[1]!, "mouseover");
    });
    await act(async () => {
      fire(ticks()[1]!, "mouseout");
    });
    expect(preview()!.textContent).toBe("Got itI'll use that");

    await act(async () => {
      ticks()[1]!.blur();
    });
    expect(preview()).toBeNull();
  });

  it("shows the focused tick's preview over a hovered one", async () => {
    await render();

    await act(async () => {
      ticks()[2]!.focus();
      fire(ticks()[0]!, "mouseover");
    });

    expect(
      container.querySelector(".aui-conversation-map-preview")!.textContent,
    ).toBe("Reload it");
  });

  it("opens the preview on the requested side", async () => {
    await render({ side: "left" });

    await act(async () => {
      fire(ticks()[0]!, "mouseover");
    });

    expect(
      container
        .querySelector(".aui-conversation-map-preview")!
        .getAttribute("class"),
    ).toContain("right-full");
  });

  it("renders nothing for an empty conversation", async () => {
    await render({ entries: [] });

    expect(ticks()).toHaveLength(0);
  });
});
