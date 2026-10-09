import { useLayoutEffect } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReceiptFocus } from "./receipt-focus";

afterEach(cleanup);

function Harness({
  settled,
  receiptKey,
  onSettle,
  onFocusCapture,
  onBlurCapture,
}: {
  settled: boolean;
  receiptKey?: string;
  onSettle?: () => void;
  onFocusCapture?: React.ComponentProps<"div">["onFocusCapture"];
  onBlurCapture?: React.ComponentProps<"div">["onBlurCapture"];
}) {
  useLayoutEffect(() => {
    if (settled) onSettle?.();
  }, [settled, onSettle]);
  const { receiptRef, focusHandlers } = useReceiptFocus({
    onFocusCapture,
    onBlurCapture,
  });
  return (
    <div {...focusHandlers}>
      {settled ? (
        <span key={receiptKey} ref={receiptRef} tabIndex={-1}>
          Receipt
        </span>
      ) : (
        <button>Answer</button>
      )}
    </div>
  );
}

describe("useReceiptFocus", () => {
  it("calls the caller's focus and blur capture handlers", () => {
    const onFocusCapture = vi.fn();
    const onBlurCapture = vi.fn();
    render(
      <Harness
        settled={false}
        onFocusCapture={onFocusCapture}
        onBlurCapture={onBlurCapture}
      />,
    );
    const answer = screen.getByRole("button", { name: "Answer" });
    answer.focus();
    answer.blur();

    expect(onFocusCapture).toHaveBeenCalledOnce();
    expect(onBlurCapture).toHaveBeenCalledOnce();
    expect(onFocusCapture.mock.calls[0]?.[0].target).toBe(answer);
    expect(onBlurCapture.mock.calls[0]?.[0].target).toBe(answer);
  });

  it("keeps focus through a replacement receipt", () => {
    const { rerender } = render(<Harness settled={false} />);
    screen.getByRole("button", { name: "Answer" }).focus();

    rerender(<Harness settled receiptKey="running" />);
    expect(document.activeElement).toBe(screen.getByText("Receipt"));

    rerender(<Harness settled receiptKey="done" />);
    expect(document.activeElement).toBe(screen.getByText("Receipt"));
  });

  it("does not steal focus after it moves outside the request", () => {
    const { rerender } = render(
      <>
        <Harness settled={false} />
        <button>Elsewhere</button>
      </>,
    );
    screen.getByRole("button", { name: "Answer" }).focus();
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();

    rerender(
      <>
        <Harness settled />
        <button>Elsewhere</button>
      </>,
    );
    expect(document.activeElement).toBe(elsewhere);
  });

  it("does not refocus after a removed control yields focus elsewhere", () => {
    const focusElsewhere = () =>
      screen.getByRole("button", { name: "Elsewhere" }).focus();
    const { rerender } = render(
      <>
        <Harness settled={false} onSettle={focusElsewhere} />
        <button>Elsewhere</button>
      </>,
    );
    const answer = screen.getByRole("button", { name: "Answer" });
    answer.focus();

    rerender(
      <>
        <Harness settled onSettle={focusElsewhere} />
        <button>Elsewhere</button>
      </>,
    );
    expect(answer.isConnected).toBe(false);
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    expect(document.activeElement).toBe(elsewhere);

    elsewhere.blur();
    expect(document.activeElement).toBe(document.body);
    rerender(
      <>
        <Harness settled onSettle={focusElsewhere} />
        <button>Elsewhere</button>
      </>,
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("does not refocus a request after its control was blurred", () => {
    const { rerender } = render(<Harness settled={false} />);
    const answer = screen.getByRole("button", { name: "Answer" });
    answer.focus();
    answer.blur();

    rerender(<Harness settled />);
    expect(document.activeElement).toBe(document.body);
  });
});
