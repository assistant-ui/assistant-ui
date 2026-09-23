// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupIntro } from "./setup-intro";

afterEach(cleanup);

describe("SetupIntro", () => {
  it("explains the three stages and connects only on request", () => {
    const onContinue = vi.fn();
    render(<SetupIntro onContinue={onContinue} />);
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Connect your agent"),
      expect.stringContaining("Review the plan"),
      expect.stringContaining("Follow the build"),
    ]);
    expect(
      screen.getByText("No files change until you approve."),
    ).toBeDefined();
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Connect agent" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
