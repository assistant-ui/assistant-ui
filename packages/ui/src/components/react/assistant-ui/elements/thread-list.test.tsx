import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThreadList, type ThreadItem } from "./thread-list";

const THREADS: ThreadItem[] = [
  { id: "first", title: "First thread", time: "2m" },
  { id: "second", title: "Second thread", time: "1h" },
];

function DeletingThreadList() {
  const [threads, setThreads] = useState(THREADS);

  return (
    <ThreadList
      threads={threads}
      activeIndex={0}
      onDelete={(index) =>
        setThreads((current) => current.filter((_, i) => i !== index))
      }
    />
  );
}

afterEach(cleanup);

describe("ThreadList", () => {
  it("does not render thread actions without handlers", () => {
    render(
      <ThreadList
        threads={THREADS}
        activeIndex={0}
        onActiveIndexChange={() => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: /rename/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("reports rename and delete actions without selecting the thread", () => {
    const onActiveIndexChange = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    render(
      <ThreadList
        threads={THREADS}
        activeIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Rename First thread" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Second thread" }),
    );

    expect(
      screen
        .getByRole("button", { name: "Rename First thread" })
        .closest("button[aria-current]"),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /first thread.*2m/i }).className,
    ).toContain("group-hover:pe-14");
    expect(onRename).toHaveBeenCalledWith(0);
    expect(onDelete).toHaveBeenCalledWith(1);
    expect(onActiveIndexChange).not.toHaveBeenCalled();
  });

  it("keeps thread selection on a separate button", () => {
    const onActiveIndexChange = vi.fn();
    render(
      <ThreadList
        threads={THREADS}
        activeIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        onRename={() => undefined}
        onDelete={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /second thread.*1h/i }));

    expect(onActiveIndexChange).toHaveBeenCalledWith(1);
  });

  it("keeps thread actions available to backward keyboard navigation", () => {
    render(
      <ThreadList
        threads={THREADS}
        activeIndex={0}
        onActiveIndexChange={() => undefined}
        onRename={() => undefined}
        onDelete={() => undefined}
      />,
    );

    const actions = screen.getByRole("button", {
      name: "Rename First thread",
    }).parentElement;

    expect(actions?.className).toContain("flex");
    expect(actions?.className).toContain("opacity-0");
    expect(actions?.className).not.toContain("hidden");
  });

  it("keeps timestamps visible when rows only expose actions", () => {
    render(
      <ThreadList
        threads={THREADS}
        activeIndex={0}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByText("2m").className).not.toContain("hidden");
  });

  it("does not reuse a focused delete button for the next thread", () => {
    render(<DeletingThreadList />);
    const deleteFirst = screen.getByRole("button", {
      name: "Delete First thread",
    });

    deleteFirst.focus();
    fireEvent.click(deleteFirst);

    expect(screen.queryByText("First thread")).toBeNull();
    expect(document.activeElement).not.toBe(
      screen.getByRole("button", { name: "Delete Second thread" }),
    );
  });
});
