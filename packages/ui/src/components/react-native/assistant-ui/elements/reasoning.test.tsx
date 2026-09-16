import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "./reasoning";

const h = vi.hoisted(() => ({
  scrollToEnd: vi.fn(),
  scrollProps: undefined as
    | {
        onContentSizeChange?: (width: number, height: number) => void;
        onScrollBeginDrag?: (event: any) => void;
        onScroll?: (event: any) => void;
        nestedScrollEnabled?: boolean;
      }
    | undefined,
}));

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
    BrainIcon: icon("BrainIcon"),
    ChevronDownIcon: icon("ChevronDownIcon"),
    ChevronRightIcon: icon("ChevronRightIcon"),
  };
});

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const Pressable = ({
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    className,
    onPress,
  }: any) =>
    React.createElement(
      "button",
      {
        "aria-expanded": String(accessibilityState?.expanded),
        "aria-label": accessibilityLabel,
        className,
        onClick: onPress,
        role: accessibilityRole,
      },
      children,
    );
  const ScrollView = React.forwardRef(function ScrollView(props: any, ref) {
    h.scrollProps = props;
    React.useImperativeHandle(ref, () => ({ scrollToEnd: h.scrollToEnd }));
    return React.createElement(
      "div",
      { className: props.className },
      props.children,
    );
  });
  const Text = ({ children, className, ...props }: any) =>
    React.createElement("span", { ...props, className }, children);

  return { ...actual, Pressable, ScrollView, Text };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

const scroll = (y: number, height: number, viewportHeight: number) => ({
  nativeEvent: {
    contentOffset: { y },
    contentSize: { height },
    layoutMeasurement: { height: viewportHeight },
  },
});

describe("Reasoning", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.scrollToEnd.mockReset();
    h.scrollProps = undefined;
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
    props: Partial<React.ComponentProps<typeof ReasoningRoot>> = {},
    textProps: Partial<React.ComponentProps<typeof ReasoningText>> = {},
    duration = 3,
    children: ReactNode = <Text>Live reasoning</Text>,
  ) => {
    await act(async () => {
      root.render(
        <ReasoningRoot {...props}>
          <ReasoningTrigger active duration={duration} />
          <ReasoningContent>
            <ReasoningText {...textProps}>{children}</ReasoningText>
          </ReasoningContent>
        </ReasoningRoot>,
      );
    });
  };

  const trigger = () =>
    container.querySelector('[aria-label="Reasoning (3s)"]') as HTMLElement;

  it("holds open while streaming, then returns to the default state", async () => {
    await render({ defaultOpen: false, streaming: true });
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Live reasoning");

    await render({ defaultOpen: false, streaming: false });
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Live reasoning");
  });

  it("keeps the first manual toggle after streaming ends", async () => {
    await render({ streaming: true });

    await act(async () => {
      click(trigger());
    });
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    await render({ streaming: false });
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    await render({ streaming: true });
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("reports controlled toggles without changing its own state", async () => {
    const onOpenChange = vi.fn();
    await render({ open: false, onOpenChange });

    await act(async () => {
      click(trigger());
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("labels the trigger with duration and its expanded state", async () => {
    await render({ defaultOpen: true });

    expect(trigger().textContent).toContain("Reasoning (3s)");
    expect(trigger().getAttribute("role")).toBe("button");
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("omits a zero-second duration", async () => {
    await render({}, {}, 0);

    expect(container.querySelector('[aria-label="Reasoning"]')).not.toBeNull();
  });

  it("wraps a primitive child in muted text", async () => {
    await render({ defaultOpen: true }, {}, 3, "Live reasoning");

    expect(
      [...container.querySelectorAll(".text-muted-foreground.text-sm")].some(
        (element) => element.textContent === "Live reasoning",
      ),
    ).toBe(true);
    expect(h.scrollProps?.nestedScrollEnabled).toBe(true);
  });

  it("pins a live preview until the reader scrolls up, then resumes at the bottom", async () => {
    await render({ streaming: true });
    h.scrollToEnd.mockReset();

    await act(async () => {
      h.scrollProps?.onContentSizeChange?.(100, 200);
    });
    expect(h.scrollToEnd).toHaveBeenCalledWith({ animated: false });

    await act(async () => {
      h.scrollProps?.onScroll?.(scroll(100, 200, 100));
      h.scrollProps?.onScroll?.(scroll(40, 200, 100));
    });

    h.scrollToEnd.mockReset();
    await act(async () => {
      h.scrollProps?.onContentSizeChange?.(100, 240);
    });
    expect(h.scrollToEnd).not.toHaveBeenCalled();

    await act(async () => {
      h.scrollProps?.onScroll?.(scroll(140, 240, 100));
      h.scrollProps?.onContentSizeChange?.(100, 260);
    });
    expect(h.scrollToEnd).toHaveBeenCalledWith({ animated: false });
  });

  it("unpins when a drag begins before its first scroll event", async () => {
    const onScrollBeginDrag = vi.fn();
    await render({ streaming: true }, { onScrollBeginDrag });
    h.scrollToEnd.mockReset();

    await act(async () => {
      h.scrollProps?.onContentSizeChange?.(100, 200);
    });
    expect(h.scrollToEnd).toHaveBeenCalledWith({ animated: false });

    const event = scroll(100, 200, 100);
    await act(async () => {
      h.scrollProps?.onScrollBeginDrag?.(event);
      h.scrollProps?.onContentSizeChange?.(100, 240);
    });

    expect(onScrollBeginDrag).toHaveBeenCalledWith(event);
    expect(h.scrollToEnd).toHaveBeenCalledTimes(1);
  });
});
