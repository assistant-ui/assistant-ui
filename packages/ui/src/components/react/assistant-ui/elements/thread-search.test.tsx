import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThreadSearch, type SearchableThread } from "./thread-search";

const scrollIntoView = vi.fn();
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: scrollIntoView,
});

afterEach(() => {
  cleanup();
  scrollIntoView.mockClear();
});

const threads: readonly SearchableThread[] = [
  {
    id: "pinned",
    title: "Pinned plan",
    group: "Earlier",
    preview: "Always first",
    pinned: true,
  },
  {
    id: "release",
    title: "Release notes",
    group: "Today",
    preview: "Ready to publish",
  },
  {
    id: "migration",
    title: "Migration",
    group: "Yesterday",
    preview: "Three steps",
  },
];

describe("ThreadSearch", () => {
  it("moves the highlight without activating until Enter", () => {
    const onActiveChange = vi.fn();
    const onSelect = vi.fn();

    function ControlledThreadSearch() {
      const [activeId, setActiveId] = useState("pinned");

      return (
        <ThreadSearch
          threads={threads}
          query=""
          activeId={activeId}
          onActiveChange={(id) => {
            onActiveChange(id);
            setActiveId(id);
          }}
          onSelect={onSelect}
        />
      );
    }

    render(<ControlledThreadSearch />);

    const input = screen.getByRole("combobox", { name: "Search threads" });
    const listbox = screen.getByRole("listbox", { name: "Threads" });
    const release = screen.getByRole("option", { name: /Release notes/ });

    expect(input.getAttribute("aria-controls")).toBe(listbox.id);
    expect(input.getAttribute("aria-activedescendant")).not.toBeNull();

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(onActiveChange).toHaveBeenCalledExactlyOnceWith("release");
    expect(onSelect).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-activedescendant")).toBe(release.id);
    expect(release.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("release");

    fireEvent.click(release);

    expect(onSelect).toHaveBeenNthCalledWith(2, "release");
  });

  it("does not activate a result filtered away from the active id", () => {
    const onActiveChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <ThreadSearch
        threads={threads}
        query="release"
        activeId="pinned"
        onActiveChange={onActiveChange}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Search threads" });
    expect(input.getAttribute("aria-activedescendant")).toBeNull();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onActiveChange).toHaveBeenCalledExactlyOnceWith("release");
  });
});
