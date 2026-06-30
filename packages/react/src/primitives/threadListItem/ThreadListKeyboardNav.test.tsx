/** @vitest-environment jsdom */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThreadListPrimitiveRoot } from "../threadList/ThreadListRoot";
import { ThreadListItemPrimitiveRoot } from "./ThreadListItemRoot";
import { ThreadListItemPrimitiveTrigger } from "./ThreadListItemTrigger";
import { ThreadListItemMorePrimitiveRoot } from "../threadListItemMore/ThreadListItemMoreRoot";
import { ThreadListItemMorePrimitiveTrigger } from "../threadListItemMore/ThreadListItemMoreTrigger";
import { ThreadListItemMorePrimitiveContent } from "../threadListItemMore/ThreadListItemMoreContent";
import { ThreadListItemMorePrimitiveItem } from "../threadListItemMore/ThreadListItemMoreItem";

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return { ...actual, useAuiState: () => false };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useThreadListItemTrigger: () => ({ switchTo: () => {} }),
  };
});

const triggers = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-radix-collection-item]"),
  );

const moreOf = (root: HTMLElement) =>
  root.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;

const renderItem = (rootProps?: { defaultOpen?: boolean }) => {
  const result = render(
    <ThreadListPrimitiveRoot>
      <ThreadListItemPrimitiveRoot>
        <ThreadListItemPrimitiveTrigger>item</ThreadListItemPrimitiveTrigger>
        <ThreadListItemMorePrimitiveRoot sharedFocusGroup {...rootProps}>
          <ThreadListItemMorePrimitiveTrigger>
            more
          </ThreadListItemMorePrimitiveTrigger>
          <ThreadListItemMorePrimitiveContent>
            <ThreadListItemMorePrimitiveItem>
              Archive
            </ThreadListItemMorePrimitiveItem>
          </ThreadListItemMorePrimitiveContent>
        </ThreadListItemMorePrimitiveRoot>
      </ThreadListItemPrimitiveRoot>
    </ThreadListPrimitiveRoot>,
  );
  return {
    ...result,
    trigger: triggers(result.container)[0]!,
    more: moreOf(result.container),
  };
};

const menu = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[role="menu"]');

describe("thread list keyboard navigation", () => {
  it("moves focus between items with the up/down arrows", () => {
    const { container } = render(
      <ThreadListPrimitiveRoot>
        {[0, 1, 2].map((i) => (
          <ThreadListItemPrimitiveRoot key={i}>
            <ThreadListItemPrimitiveTrigger>
              item {i}
            </ThreadListItemPrimitiveTrigger>
          </ThreadListItemPrimitiveRoot>
        ))}
      </ThreadListPrimitiveRoot>,
    );
    const [first, second] = triggers(container);

    first!.focus();
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(first);
  });

  it("moves between an item and its More button with right/left arrows", () => {
    const { trigger, more } = renderItem();

    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    expect(document.activeElement).toBe(more);

    fireEvent.keyDown(more, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(trigger);
  });

  it("opens the More menu on ArrowRight", () => {
    const { more } = renderItem();

    more.focus();
    fireEvent.keyDown(more, { key: "ArrowRight" });

    expect(menu()).not.toBeNull();
  });

  it.each(["ArrowLeft", "Escape"])(
    "closes the menu on %s and returns focus to the More button",
    (key) => {
      const { more } = renderItem({ defaultOpen: true });

      fireEvent.keyDown(menu() as HTMLElement, { key });

      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(more);
    },
  );

  it("leaves the More menu's arrow keys inert without sharedFocusGroup (the default)", () => {
    const result = render(
      <ThreadListPrimitiveRoot>
        <ThreadListItemPrimitiveRoot>
          <ThreadListItemPrimitiveTrigger>item</ThreadListItemPrimitiveTrigger>
          <ThreadListItemMorePrimitiveRoot>
            <ThreadListItemMorePrimitiveTrigger>
              more
            </ThreadListItemMorePrimitiveTrigger>
            <ThreadListItemMorePrimitiveContent>
              <ThreadListItemMorePrimitiveItem>
                Archive
              </ThreadListItemMorePrimitiveItem>
            </ThreadListItemMorePrimitiveContent>
          </ThreadListItemMorePrimitiveRoot>
        </ThreadListItemPrimitiveRoot>
      </ThreadListPrimitiveRoot>,
    );
    const more = moreOf(result.container);

    more.focus();
    fireEvent.keyDown(more, { key: "ArrowRight" });
    expect(menu()).toBeNull();
  });
});
