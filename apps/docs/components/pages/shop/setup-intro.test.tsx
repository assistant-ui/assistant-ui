// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupIntro } from "./setup-intro";
import { WizardHost } from "./test/wizard-host";

afterEach(cleanup);

describe("SetupIntro", () => {
  it("lists the four stages in order and continues on request", () => {
    const onContinue = vi.fn();
    render(
      <WizardHost>
        <SetupIntro onContinue={onContinue} />
      </WizardHost>,
    );
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Connect your agent"),
      expect.stringContaining("Your agent explores your codebase"),
      expect.stringContaining("You approve the plan"),
      expect.stringContaining("Your agent implements it"),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
