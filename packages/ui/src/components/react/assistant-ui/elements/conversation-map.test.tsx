import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConversationMap, type ConversationMapEntry } from "./conversation-map";

const ENTRIES: ConversationMapEntry[] = [
  { id: "m1", role: "user", title: "Chat ready", preview: "the ready dot" },
  { id: "m2", role: "assistant", title: "Got it", preview: "I'll use that" },
  { id: "m3", role: "user", title: "Reload it" },
];

const ticks = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="conversation-map-tick"]',
    ),
  );

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

  it("marks only the active entry as current", () => {
    render(<ConversationMap entries={ENTRIES} activeId="m2" />);

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
  });

  it("gives the active tick the only tab stop", () => {
    render(<ConversationMap entries={ENTRIES} activeId="m3" />);

    expect(ticks().map((tick) => tick.tabIndex)).toEqual([-1, -1, 0]);
  });

  it("falls back to the first tab stop when nothing is active", () => {
    render(<ConversationMap entries={ENTRIES} />);

    expect(ticks().map((tick) => tick.tabIndex)).toEqual([0, -1, -1]);
  });

  it("reports the selected entry", () => {
    const onSelect = vi.fn();
    render(<ConversationMap entries={ENTRIES} onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText("Got it"));

    expect(onSelect).toHaveBeenCalledWith("m2");
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
    render(<ConversationMap entries={ENTRIES} activeId="m1" />);
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
