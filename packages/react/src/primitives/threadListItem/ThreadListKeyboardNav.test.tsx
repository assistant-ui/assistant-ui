/** @vitest-environment jsdom */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThreadListPrimitiveRoot } from "../threadList/ThreadListRoot";
import { ThreadListItemPrimitiveRoot } from "./ThreadListItemRoot";
import { ThreadListItemPrimitiveTrigger } from "./ThreadListItemTrigger";
import { ThreadListItemMorePrimitiveRoot } from "../threadListItemMore/ThreadListItemMoreRoot";
import { ThreadListItemMorePrimitiveTrigger } from "../threadListItemMore/ThreadListItemMoreTrigger";

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: () => false,
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useThreadListItemTrigger: () => ({ switchTo: () => {} }),
  };
});

const renderList = (count: number) =>
  render(
    <ThreadListPrimitiveRoot>
      {Array.from({ length: count }, (_, i) => (
        <ThreadListItemPrimitiveRoot key={i}>
          <ThreadListItemPrimitiveTrigger>
            item {i}
          </ThreadListItemPrimitiveTrigger>
          <ThreadListItemMorePrimitiveRoot>
            <ThreadListItemMorePrimitiveTrigger>
              more {i}
            </ThreadListItemMorePrimitiveTrigger>
          </ThreadListItemMorePrimitiveRoot>
        </ThreadListItemPrimitiveRoot>
      ))}
    </ThreadListPrimitiveRoot>,
  );

const triggers = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-radix-collection-item]"),
  );

describe("thread list keyboard navigation", () => {
  it("keeps every item trigger a native tab stop (no roving tabindex)", () => {
    const { container } = renderList(3);
    for (const trigger of triggers(container)) {
      expect(trigger.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("moves focus to the next item on ArrowDown", () => {
    const { container } = renderList(3);
    const [first, second] = triggers(container);
    first!.focus();

    fireEvent.keyDown(first!, { key: "ArrowDown" });

    expect(document.activeElement).toBe(second);
  });

  it("moves focus to the previous item on ArrowUp", () => {
    const { container } = renderList(3);
    const [first, second] = triggers(container);
    second!.focus();

    fireEvent.keyDown(second!, { key: "ArrowUp" });

    expect(document.activeElement).toBe(first);
  });

  it("does not move past the last item on ArrowDown", () => {
    const { container } = renderList(2);
    const list = triggers(container);
    const last = list[list.length - 1]!;
    last.focus();

    fireEvent.keyDown(last, { key: "ArrowDown" });

    expect(document.activeElement).toBe(last);
  });

  it("focuses the More button on ArrowRight and returns on ArrowLeft", () => {
    const { container } = renderList(2);
    const first = triggers(container)[0]!;
    const more = first.parentElement!.querySelector<HTMLButtonElement>(
      '[aria-haspopup="menu"]',
    )!;
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(more);

    fireEvent.keyDown(more, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
  });

  it("leaves ArrowDown on the More button to the native dropdown", () => {
    const { container } = renderList(2);
    const first = triggers(container)[0]!;
    const more = first.parentElement!.querySelector<HTMLButtonElement>(
      '[aria-haspopup="menu"]',
    )!;
    more.focus();

    fireEvent.keyDown(more, { key: "ArrowDown" });

    expect(document.activeElement).toBe(more);
  });
});
