import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThreadList, type ThreadItem } from "./thread-list";

const THREADS: ThreadItem[] = [
  { title: "First thread", time: "2m" },
  { title: "Second thread", time: "1h" },
];

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
});
