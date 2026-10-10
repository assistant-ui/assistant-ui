import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { version } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OptionList, type OptionListOption } from "./option-list";

afterEach(cleanup);

const OPTIONS: OptionListOption[] = [
  {
    id: "merge",
    label: "Merge duplicates",
    description: "Combine them into one contact",
  },
  { id: "keep", label: "Keep all" },
  { id: "review", label: "Review manually" },
  { id: "delete", label: "Delete both", disabled: true },
];

describe("OptionList", () => {
  it.skipIf(version.startsWith("18."))(
    "runs the callback ref cleanup when the receipt unmounts",
    () => {
      const cleanupRef = vi.fn();
      const ref = vi.fn((_node: HTMLDivElement | null) => cleanupRef);
      const { unmount } = render(
        <OptionList options={OPTIONS} choice={["keep"]} ref={ref} />,
      );

      expect(ref).toHaveBeenCalledWith(
        screen.getByText("Keep all").closest('[data-slot="option-list"]'),
      );
      unmount();
      expect(cleanupRef).toHaveBeenCalledOnce();
      expect(ref).not.toHaveBeenCalledWith(null);
    },
  );

  it("focuses the receipt after a focused option settles", async () => {
    const { rerender } = render(
      <OptionList options={OPTIONS} onConfirm={() => {}} />,
    );
    const answer = screen.getByRole("button", { name: /Keep all/ });
    answer.focus();

    await act(async () => {
      fireEvent.click(answer);
    });

    const receipt = screen
      .getByText("Keep all")
      .closest('[data-slot="option-list"]');
    expect(document.activeElement).toBe(receipt);

    rerender(<OptionList options={OPTIONS} choice={["review"]} />);
    expect(document.activeElement).toBe(receipt);
  });

  it("focuses the receipt after a focused confirm button settles", async () => {
    render(
      <OptionList
        options={OPTIONS}
        selectionMode="multiple"
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Keep all/ }));
    const confirm = screen.getByRole("button", { name: "Confirm" });
    confirm.focus();

    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(document.activeElement).toBe(
      screen.getByText("Keep all").closest('[data-slot="option-list"]'),
    );
  });

  it("only displays its options without a confirm handler", () => {
    render(<OptionList options={OPTIONS} />);

    expect(screen.getByText("Merge duplicates")).toBeTruthy();
    expect(screen.getByText("Combine them into one contact")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("commits a single pick and ignores further picks while it lands", () => {
    const onConfirm = vi.fn(() => new Promise<void>(() => {}));
    render(<OptionList options={OPTIONS} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /Keep all/ }));
    fireEvent.click(screen.getByRole("button", { name: /Review manually/ }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(["keep"]);
    expect(screen.getByRole("group").getAttribute("aria-busy")).toBe("true");
  });

  it("settles a confirmed pick into a receipt without a choice prop", async () => {
    let resolve: (() => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(<OptionList options={OPTIONS} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /Keep all/ }));
    expect(screen.getByRole("group").getAttribute("aria-busy")).toBe("true");

    await act(async () => {
      resolve?.();
    });

    expect(screen.getByText("Keep all")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(
      screen
        .getByText("Keep all")
        .closest("[data-slot]")
        ?.getAttribute("data-state"),
    ).toBe("receipt");
  });

  it("reopens with the error when the answer is refused", async () => {
    const onConfirm = vi
      .fn<(ids: string[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error("The thread cannot take an answer"))
      .mockResolvedValueOnce();
    render(<OptionList options={OPTIONS} onConfirm={onConfirm} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Keep all/ }));
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "The thread cannot take an answer",
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Review manually/ }));
    });
    expect(onConfirm).toHaveBeenLastCalledWith(["review"]);
  });

  it("marks a single selection's default as the current answer", () => {
    const onConfirm = vi.fn();
    render(
      <OptionList
        options={OPTIONS}
        defaultValue={["review"]}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Review manually/ }).className,
    ).toContain("bg-foreground/[0.06]");
    fireEvent.click(screen.getByRole("button", { name: /Keep all/ }));
    expect(onConfirm).toHaveBeenCalledWith(["keep"]);
  });

  it("never commits a disabled option", () => {
    const onConfirm = vi.fn();
    render(<OptionList options={OPTIONS} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /Delete both/ }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms a multiple selection within its bounds, in option order", () => {
    const onConfirm = vi.fn();
    render(
      <OptionList
        options={OPTIONS}
        selectionMode="multiple"
        minSelections={2}
        maxSelections={2}
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Confirm" });

    fireEvent.click(screen.getByRole("checkbox", { name: /Review manually/ }));
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirm.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(screen.getByRole("checkbox", { name: /Merge duplicates/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Keep all/ }));
    expect(
      screen
        .getByRole("checkbox", { name: /Keep all/ })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(screen.getByText("2 of 2")).toBeTruthy();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(["merge", "review"]);
  });

  it("starts a multiple selection from its default value", () => {
    render(
      <OptionList
        options={OPTIONS}
        selectionMode="multiple"
        defaultValue={["keep", "missing"]}
        onConfirm={() => {}}
      />,
    );

    expect(
      screen
        .getByRole("checkbox", { name: /Keep all/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByText("1 of 4")).toBeTruthy();
  });

  it("ignores unavailable selections when enforcing the selection bounds", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <OptionList
        options={OPTIONS.slice(0, 2)}
        selectionMode="multiple"
        defaultValue={["merge"]}
        minSelections={1}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("1 of 2")).toBeTruthy();

    rerender(
      <OptionList
        options={[OPTIONS[1]!]}
        selectionMode="multiple"
        defaultValue={["merge"]}
        minSelections={1}
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(screen.getByText("0 of 1")).toBeTruthy();
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /Keep all/ }));
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(["keep"]);
  });

  it("renders the committed choice as a receipt of just those options", () => {
    render(
      <OptionList
        options={OPTIONS}
        choice={["review", "merge"]}
        onConfirm={() => {}}
      />,
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("Merge duplicates")).toBeTruthy();
    expect(screen.getByText("Review manually")).toBeTruthy();
    expect(screen.queryByText("Keep all")).toBeNull();
    expect(screen.getAllByText("Selected:")).toHaveLength(2);
  });

  it("says so when the committed choice is empty", () => {
    render(<OptionList options={OPTIONS} choice={[]} />);

    expect(screen.getByText("Nothing selected")).toBeTruthy();
  });
});
