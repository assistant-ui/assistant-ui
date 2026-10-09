import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useReceiptFocus } from "./receipt-focus";

afterEach(cleanup);

function Harness({
  settled,
  receiptKey,
}: {
  settled: boolean;
  receiptKey?: string;
}) {
  const { receiptRef, focusHandlers } = useReceiptFocus();
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

  it("does not refocus a request after its control was blurred", () => {
    const { rerender } = render(<Harness settled={false} />);
    const answer = screen.getByRole("button", { name: "Answer" });
    answer.focus();
    answer.blur();

    rerender(<Harness settled />);
    expect(document.activeElement).toBe(document.body);
  });
});
