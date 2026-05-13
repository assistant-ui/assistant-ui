import { describe, it, expect, vi } from "vitest";
import { createResourceRoot } from "@assistant-ui/tap";
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
  const root = createResourceRoot();
  const sub = root.render(TriggerKeyboardResource(props));
  return { sub, props };
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
});
