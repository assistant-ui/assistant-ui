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
    const pinned = screen.getByRole("option", { name: /Pinned plan/ });
    const release = screen.getByRole("option", { name: /Release notes/ });
    const migration = screen.getByRole("option", { name: /Migration/ });

    expect(input.getAttribute("aria-controls")).toBe(listbox.id);
    expect(input.getAttribute("aria-activedescendant")).toBe(pinned.id);
    expect(scrollIntoView).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(onActiveChange).toHaveBeenCalledExactlyOnceWith("release");
    expect(onSelect).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(input.getAttribute("aria-activedescendant")).toBe(release.id);
    expect(release.getAttribute("aria-selected")).toBe("true");

    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("release");

    input.focus();
    expect(fireEvent.mouseDown(migration)).toBe(false);
    fireEvent.click(migration);

    expect(document.activeElement).toBe(input);
    expect(onSelect).toHaveBeenNthCalledWith(2, "migration");
    expect(onActiveChange).toHaveBeenLastCalledWith("migration");
    expect(migration.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenNthCalledWith(3, "migration");
  });

  it("does not activate the highlighted thread on an IME confirmation Enter", () => {
    const onActiveChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <ThreadSearch
        threads={threads}
        query=""
        activeId="pinned"
        onActiveChange={onActiveChange}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Search threads" });
    fireEvent.keyDown(input, {
      key: "Enter",
      keyCode: 229,
      isComposing: false,
    });

    expect(onSelect).not.toHaveBeenCalled();
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

    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onActiveChange).toHaveBeenCalledExactlyOnceWith("release");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the empty status outside the expanded listbox", () => {
    render(
      <ThreadSearch threads={threads} query="missing" activeId="pinned" />,
    );

    const input = screen.getByRole("combobox", { name: "Search threads" });
    const listbox = screen.getByRole("listbox", { name: "Threads" });
    const status = screen.getByRole("status");

    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(listbox.children).toHaveLength(0);
    expect(listbox.contains(status)).toBe(false);
    expect(status.textContent).toBe("No thread matches “missing”");
  });
});
