// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupIntro } from "./setup-intro";

afterEach(cleanup);

describe("SetupIntro", () => {
  it("lists the four stages in order and continues on request", () => {
    const onContinue = vi.fn();
    render(<SetupIntro onContinue={onContinue} />);
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Connect your agent"),
      expect.stringContaining("Your agent explores your codebase"),
      expect.stringContaining("You approve the plan"),
      expect.stringContaining("Your agent implements it"),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
