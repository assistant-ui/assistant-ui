import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolFallbackApproval } from "./tool-fallback";

const pendingApproval = { id: "req_1" };

// React reports an error thrown by an event handler through `reportError`,
// which jsdom surfaces as a window error event rather than to the caller.
const captureWindowErrors = () => {
  const errors: ErrorEvent[] = [];
  const listener = (event: ErrorEvent) => {
    errors.push(event);
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  window.addEventListener("error", listener, true);
  return {
    errors,
    restore: () => window.removeEventListener("error", listener, true),
  };
};

const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

afterEach(cleanup);

describe("ToolFallbackApproval", () => {
  it("keeps the controls actionable when the runtime refuses the response", () => {
    let refuses = true;
    const respondToApproval = vi.fn(() => {
      if (refuses) throw new Error("response cannot be mapped");
    });
    const { errors, restore } = captureWindowErrors();

    try {
      render(
        <ToolFallbackApproval
          approval={pendingApproval}
          respondToApproval={respondToApproval}
        />,
      );

      fireEvent.click(button("Allow"));

      expect(errors.map((event) => event.error?.message)).toEqual([
        "response cannot be mapped",
      ]);
      expect(button("Allow").disabled).toBe(false);
      expect(button("Deny").disabled).toBe(false);

      refuses = false;
      fireEvent.click(button("Allow"));

      expect(respondToApproval).toHaveBeenLastCalledWith({ approved: true });
      expect(button("Allow").disabled).toBe(true);
      expect(button("Deny").disabled).toBe(true);
    } finally {
      restore();
    }
  });

  it("disables the controls once a response is accepted", () => {
    const respondToApproval = vi.fn();

    render(
      <ToolFallbackApproval
        approval={pendingApproval}
        respondToApproval={respondToApproval}
      />,
    );

    fireEvent.click(button("Deny"));

    expect(respondToApproval).toHaveBeenCalledWith({ approved: false });
    expect(button("Allow").disabled).toBe(true);
    expect(button("Deny").disabled).toBe(true);
  });
});
