import { describe, it, expect, vi } from "vitest";
import { createTapRoot, useResource } from "@assistant-ui/tap";
import type {
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import { TriggerKeyboardResource } from "./triggerKeyboardResource";

const item = (id: string): Unstable_TriggerItem => ({
  id,
  type: "command",
  label: id,
});

const category = (id: string): Unstable_TriggerCategory => ({
  id,
  label: id,
});

const makeKeyEvent = (key: string, shiftKey = false) => ({
  key,
  shiftKey,
  preventDefault: vi.fn(),
});

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const render = (
  overrides: Partial<Parameters<typeof TriggerKeyboardResource>[0]> = {},
) => {
  const props = {
    navigableList: [item("a"), item("b"), item("c")],
    isSearchMode: false,
    activeCategoryId: null as string | null,
    query: "",
    popoverId: "popover",
    open: true,
    selectItem: vi.fn(),
    selectCategory: vi.fn(),
    goBack: vi.fn(),
    close: vi.fn(),
    ...overrides,
  };
  const root = createTapRoot(function Root() {
    return useResource(TriggerKeyboardResource(props));
  });
  return { sub: root, props };
};

describe("TriggerKeyboardResource", () => {
  it("selects highlighted item on Tab", () => {
    const { sub, props } = render();
    const e = makeKeyEvent("Tab");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(props.selectItem).toHaveBeenCalledWith(props.navigableList[0]);
    expect(props.selectCategory).not.toHaveBeenCalled();
  });

  it("selects category on Tab when entry is a category", () => {
    const { sub, props } = render({
      navigableList: [category("cat-1"), item("b")],
    });

    const consumed = sub.getValue().handleKeyDown(makeKeyEvent("Tab"));

    expect(consumed).toBe(true);
    expect(props.selectCategory).toHaveBeenCalledWith("cat-1");
    expect(props.selectItem).not.toHaveBeenCalled();
  });

  it("lets Shift+Tab pass through for native focus traversal", () => {
    const { sub, props } = render();
    const e = makeKeyEvent("Tab", true);

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(props.selectItem).not.toHaveBeenCalled();
  });

  it("swallows Tab when the navigable list is empty", () => {
    const { sub, props } = render({ navigableList: [] });
    const e = makeKeyEvent("Tab");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(props.selectItem).not.toHaveBeenCalled();
    expect(props.selectCategory).not.toHaveBeenCalled();
  });

  it("does nothing when the popover is closed", () => {
    const { sub, props } = render({ open: false });
    const e = makeKeyEvent("Tab");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(props.selectItem).not.toHaveBeenCalled();
  });

  it("moves the highlight forward on ArrowDown", async () => {
    const { sub } = render();

    const consumed = sub.getValue().handleKeyDown(makeKeyEvent("ArrowDown"));
    await tick();

    expect(consumed).toBe(true);
    expect(sub.getValue().highlightedIndex).toBe(1);
  });

  it("wraps the highlight to the top on ArrowDown past the last entry", async () => {
    const { sub } = render();
    const handle = sub.getValue().handleKeyDown;

    handle(makeKeyEvent("ArrowDown"));
    handle(makeKeyEvent("ArrowDown"));
    handle(makeKeyEvent("ArrowDown"));
    await tick();

    expect(sub.getValue().highlightedIndex).toBe(0);
  });

  it("moves the highlight backward on ArrowUp", async () => {
    const { sub } = render();
    const handle = sub.getValue().handleKeyDown;

    handle(makeKeyEvent("ArrowDown"));
    await tick();
    handle(makeKeyEvent("ArrowUp"));
    await tick();

    expect(sub.getValue().highlightedIndex).toBe(0);
  });

  it("wraps the highlight to the bottom on ArrowUp from the first entry", async () => {
    const { sub } = render();

    sub.getValue().handleKeyDown(makeKeyEvent("ArrowUp"));
    await tick();

    expect(sub.getValue().highlightedIndex).toBe(2);
  });

  it("keeps the highlight at 0 on ArrowDown when navigableList is empty", async () => {
    const { sub } = render({ navigableList: [] });
    const e = makeKeyEvent("ArrowDown");

    const consumed = sub.getValue().handleKeyDown(e);
    await tick();

    expect(consumed).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(sub.getValue().highlightedIndex).toBe(0);
  });

  it("selects the highlighted item on Enter", () => {
    const { sub, props } = render();
    const e = makeKeyEvent("Enter");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(props.selectItem).toHaveBeenCalledWith(props.navigableList[0]);
  });

  it("lets Shift+Enter pass through for newline insertion", () => {
    const { sub, props } = render();
    const e = makeKeyEvent("Enter", true);

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(props.selectItem).not.toHaveBeenCalled();
  });

  it("closes the popover on Escape", () => {
    const { sub, props } = render();
    const e = makeKeyEvent("Escape");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(props.close).toHaveBeenCalled();
  });

  it("drills back on Backspace when a category is active and the query is empty", () => {
    const { sub, props } = render({
      activeCategoryId: "cat-1",
      query: "",
    });
    const e = makeKeyEvent("Backspace");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(props.goBack).toHaveBeenCalled();
  });

  it("lets Backspace pass through when the query is non-empty", () => {
    const { sub, props } = render({
      activeCategoryId: "cat-1",
      query: "foo",
    });
    const e = makeKeyEvent("Backspace");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(props.goBack).not.toHaveBeenCalled();
  });

  it("lets Backspace pass through when no category is active", () => {
    const { sub, props } = render({
      activeCategoryId: null,
      query: "",
    });
    const e = makeKeyEvent("Backspace");

    const consumed = sub.getValue().handleKeyDown(e);

    expect(consumed).toBe(false);
    expect(props.goBack).not.toHaveBeenCalled();
  });
});
