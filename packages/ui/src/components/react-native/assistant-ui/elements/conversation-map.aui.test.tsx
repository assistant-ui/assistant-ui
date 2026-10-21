import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationMapAui } from "./conversation-map.aui";

const h = vi.hoisted(() => ({
  messages: [] as any[],
  viewport: {
    visibleMessageIds: [] as string[],
    descent: 0,
    height: 480,
    top: 24,
    scrollToMessage: vi.fn(),
  },
}));

vi.mock("@assistant-ui/react-native", () => ({
  useAuiState: (selector: (state: any) => unknown) =>
    selector({ thread: { messages: h.messages } }),
}));

vi.mock("./thread.aui", () => ({
  useThreadViewport: () => h.viewport,
}));

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
    onLongPress: _onLongPress,
    onPressOut: _onPressOut,
    onHoverIn: _onHoverIn,
    onHoverOut: _onHoverOut,
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
      },
      typeof children === "function" ? children({ pressed: false }) : children,
    );

  return { ...actual, Pressable, Text, View };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const message = (
  id: string,
  role: "user" | "assistant",
  content: unknown[],
  attachments: unknown[] = [],
) => ({ id, role, content, attachments });

const text = (value: string) => ({ type: "text", text: value });

describe("ConversationMapAui", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.messages.splice(0);
    h.viewport.visibleMessageIds = [];
    h.viewport.descent = 0;
    h.viewport.height = 480;
    h.viewport.top = 24;
    h.viewport.scrollToMessage.mockReset();
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
    props: Parameters<typeof ConversationMapAui>[0] = {},
  ) => {
    await act(async () => {
      root.render(<ConversationMapAui {...props} />);
    });
  };

  const ticks = () => Array.from(container.querySelectorAll("button"));

  const conversation = () => {
    h.messages.push(
      message("u1", "user", [text("Chat ready\nis the dot green")]),
      message("a1", "assistant", [text("The dot is green once it connects.")]),
      message("u2", "user", [{ type: "tool-call", toolName: "reload" }]),
      message("a2", "assistant", [text("Reloaded.")]),
      message("u3", "user", [], [{ type: "image" }]),
    );
  };

  it("updates the preview when a message is replaced with the same id", async () => {
    h.messages = [
      message("u1", "user", [text("Question")]),
      message("a1", "assistant", [text("Old preview")]),
    ];
    await render();

    h.messages = [
      h.messages[0],
      message("a1", "assistant", [text("New preview")]),
    ];
    await render();

    expect(ticks()[0]?.getAttribute("aria-description")).toBe("New preview");
  });

  it("rebuilds a turn when its user head is replaced by an assistant", async () => {
    const first = message("u1", "user", [text("First")]);
    const firstAnswer = message("a1", "assistant", [text("First answer")]);
    const second = message("u2", "user", [text("Second")]);
    h.messages = [first, firstAnswer, second];
    await render();

    h.messages = [
      first,
      firstAnswer,
      message("a2", "assistant", [text("Continued answer")]),
    ];
    await render();

    expect(ticks().map((tick) => tick.getAttribute("aria-label"))).toEqual([
      "First",
    ]);
  });

  it("does not reproject completed turns during a streaming update", async () => {
    let reads = 0;
    const counted = (
      id: string,
      role: "user" | "assistant",
      value: string,
    ) => ({
      attachments: [],
      get id() {
        reads++;
        return id;
      },
      get role() {
        reads++;
        return role;
      },
      get content() {
        reads++;
        return [text(value)];
      },
    });
    const prefix = Array.from({ length: 100 }, (_, index) => [
      counted(`u${index}`, "user", `Question ${index}`),
      counted(`a${index}`, "assistant", `Answer ${index}`),
    ]).flat();
    const tail = message("tail", "user", [text("Tail question")]);
    h.messages = [
      ...prefix,
      tail,
      message("stream", "assistant", [text("Old")]),
    ];
    await render();

    reads = 0;
    h.messages = [
      ...prefix,
      tail,
      message("stream", "assistant", [text("New")]),
    ];
    await render();

    expect(reads).toBe(0);
    expect(ticks().map((tick) => tick.getAttribute("aria-label"))).toEqual([
      ...Array.from({ length: 100 }, (_, index) => `Question ${index}`),
      "Tail question",
    ]);
  });

  it("draws one tick per turn, titled by the question and previewed by the answer", async () => {
    conversation();
    await render();

    expect(ticks().map((tick) => tick.getAttribute("aria-label"))).toEqual([
      "Chat ready",
      "reload",
      "Image",
    ]);
    expect(
      ticks().map((tick) => tick.getAttribute("aria-description")),
    ).toEqual(["The dot is green once it connects.", "Reloaded.", null]);
  });

  it("marks the turns on screen and reads the first of them until the end draws near", async () => {
    conversation();
    h.viewport.visibleMessageIds = ["a1", "u2", "a2"];
    await render();

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      "true",
      null,
      null,
    ]);

    h.viewport.descent = 1;
    await render();

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
  });

  it("scrolls to the head of the selected turn", async () => {
    conversation();
    await render();

    await act(async () => {
      ticks()[1]!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(h.viewport.scrollToMessage).toHaveBeenCalledWith("u2");
  });

  it("sizes the rail to the list, follows its offset and pins it to the list's left gutter", async () => {
    conversation();
    await render();

    const rail = () => container.querySelector(".aui-conversation-map-rail")!;
    expect(rail().getAttribute("style")).toContain("height: 480px");
    expect(rail().getAttribute("style")).toContain("top: 24px");
    expect(rail().getAttribute("class")).toContain("left-0");

    h.viewport.top = 55;
    h.viewport.height = 425;
    await render();

    expect(rail().getAttribute("style")).toContain("top: 55px");
    expect(rail().getAttribute("style")).toContain("height: 425px");
  });

  it("renders nothing for an empty thread", async () => {
    await render();

    expect(container.innerHTML).toBe("");
  });
});
