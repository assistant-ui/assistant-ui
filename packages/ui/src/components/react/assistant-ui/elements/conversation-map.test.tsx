import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConversationMap, type ConversationMapEntry } from "./conversation-map";

const ENTRIES: ConversationMapEntry[] = [
  { id: "t1", title: "Chat ready", preview: "the ready dot" },
  { id: "t2", title: "Got it", preview: "I'll use that" },
  { id: "t3", title: "Reload it" },
];

const ticks = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="conversation-map-tick"]',
    ),
  );

const lit = () => ticks().map((tick) => tick.hasAttribute("data-active"));
const onScreen = () => ticks().map((tick) => tick.hasAttribute("data-in-view"));

afterEach(cleanup);

describe("ConversationMap", () => {
  it("renders one labelled tick per entry", () => {
    render(<ConversationMap entries={ENTRIES} />);

    expect(ticks().map((tick) => tick.getAttribute("aria-label"))).toEqual([
      "Chat ready",
      "Got it",
      "Reload it",
    ]);
  });

  it("lights only the turn being read", () => {
    render(<ConversationMap entries={ENTRIES} activeId="t2" />);

    expect(lit()).toEqual([false, true, false]);
    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
  });

  it("marks the window separately from the turn being read", () => {
    render(
      <ConversationMap
        entries={ENTRIES}
        activeId="t2"
        visibleIds={["t2", "t3"]}
      />,
    );

    expect(lit()).toEqual([false, true, false]);
    expect(onScreen()).toEqual([false, true, true]);
  });

  it("keeps the turn being read inside the window", () => {
    render(
      <ConversationMap entries={ENTRIES} activeId="t1" visibleIds={["t3"]} />,
    );

    expect(onScreen()).toEqual([true, false, true]);
  });

  it("gives the active entry the only tab stop", () => {
    render(<ConversationMap entries={ENTRIES} activeId="t2" />);

    expect(ticks().map((tick) => tick.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("falls back to the first tab stop when nothing is active", () => {
    render(<ConversationMap entries={ENTRIES} />);

    expect(lit()).toEqual([false, false, false]);
    expect(ticks().map((tick) => tick.tabIndex)).toEqual([0, -1, -1]);
  });

  it("reports the selected entry", () => {
    const onSelect = vi.fn();
    render(<ConversationMap entries={ENTRIES} onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText("Got it"));

    expect(onSelect).toHaveBeenCalledWith("t2");
  });

  it("moves focus along the rail with the arrow keys", () => {
    render(<ConversationMap entries={ENTRIES} />);
    const [first, second, third] = ticks();

    first!.focus();
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second!, { key: "End" });
    expect(document.activeElement).toBe(third);

    fireEvent.keyDown(third!, { key: "Home" });
    expect(document.activeElement).toBe(first);
  });

  it("moves the tab stop to the tick the keyboard reached", () => {
    render(<ConversationMap entries={ENTRIES} activeId="t1" />);
    const [first, second] = ticks();

    first!.focus();
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    fireEvent.focus(second!);

    expect(ticks().map((tick) => tick.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("keeps a consumer's key handler and its own", () => {
    const onKeyDown = vi.fn();
    render(<ConversationMap entries={ENTRIES} onKeyDown={onKeyDown} />);
    const [first, second] = ticks();

    first!.focus();
    fireEvent.keyDown(first!, { key: "ArrowDown" });

    expect(onKeyDown).toHaveBeenCalled();
    expect(document.activeElement).toBe(second);
  });

  it("stops at the ends of the rail", () => {
    render(<ConversationMap entries={ENTRIES} />);
    const [first] = ticks();

    first!.focus();
    fireEvent.keyDown(first!, { key: "ArrowUp" });

    expect(document.activeElement).toBe(first);
  });

  it("renders nothing for an empty conversation", () => {
    render(<ConversationMap entries={[]} />);

    expect(ticks()).toHaveLength(0);
  });
});
