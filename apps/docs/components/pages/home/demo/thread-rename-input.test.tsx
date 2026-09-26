// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThreadRenameInput } from "./thread-rename-input";

afterEach(cleanup);

describe("thread rename", () => {
  it("selects the existing name, saves a trimmed title once, and waits for completion", async () => {
    let finish!: () => void;
    const onRename = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const onDone = vi.fn();
    render(
      <ThreadRenameInput
        title="First thread"
        onRename={onRename}
        onDone={onDone}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "Rename thread",
    }) as HTMLInputElement;
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    fireEvent.change(input, { target: { value: "  New name  " } });
    fireEvent.submit(input.closest("form")!);
    fireEvent.submit(input.closest("form")!);
    expect(onRename).toHaveBeenCalledExactlyOnceWith("New name");
    expect(screen.getByRole("status").textContent).toBe("Saving…");
    expect(onDone).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(onDone).toHaveBeenCalledExactlyOnceWith(true));
  });

  it("does not save while moving focus to Cancel", () => {
    const onRename = vi.fn();
    const onDone = vi.fn();
    render(
      <ThreadRenameInput title="First" onRename={onRename} onDone={onDone} />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Discard me" } });
    const cancel = screen.getByRole("button", { name: "Cancel rename" });
    fireEvent.blur(input, { relatedTarget: cancel });
    fireEvent.click(cancel);
    expect(onRename).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("does not move focus or close another editor after unmounting during a save", async () => {
    let finish!: () => void;
    const onRename = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    const onDone = vi.fn();
    const { unmount } = render(
      <ThreadRenameInput title="First" onRename={onRename} onDone={onDone} />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Updated" } });
    fireEvent.submit(input.closest("form")!);
    unmount();
    await act(async () => finish());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("retains the draft and shows an error when saving fails, then allows retry", async () => {
    const onRename = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const onDone = vi.fn();
    render(
      <ThreadRenameInput title="First" onRename={onRename} onDone={onDone} />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Keep this" } });
    fireEvent.submit(input.closest("form")!);
    await screen.findByRole("alert");
    expect(input.value).toBe("Keep this");
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
  });

  it("cancels with Escape and ignores Enter during composition", () => {
    const onRename = vi.fn();
    const onDone = vi.fn();
    render(
      <ThreadRenameInput title="First" onRename={onRename} onDone={onDone} />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    expect(fireEvent.keyDown(input, { key: "Enter", isComposing: true })).toBe(
      false,
    );
    expect(onRename).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onDone).toHaveBeenCalledWith(true);
    expect(onRename).not.toHaveBeenCalled();
  });
});
