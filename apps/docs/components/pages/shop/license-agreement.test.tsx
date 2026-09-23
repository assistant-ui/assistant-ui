// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LicenseAgreement } from "./license-agreement";
import { WizardHost } from "./test/wizard-host";

afterEach(cleanup);

describe("LicenseAgreement", () => {
  it("holds Next until the terms are accepted", () => {
    const onAccept = vi.fn();
    render(
      <WizardHost>
        <LicenseAgreement accepted={false} onAccept={onAccept} />
      </WizardHost>,
    );
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toHaveProperty("disabled", true);

    fireEvent.click(
      screen.getByRole("radio", {
        name: "I do not accept the terms of the license agreement",
      }),
    );
    expect(next).toHaveProperty("disabled", true);
    expect(screen.getByRole("status").textContent).toContain("cannot continue");

    fireEvent.click(
      screen.getByRole("radio", {
        name: "I accept the terms of the license agreement",
      }),
    );
    expect(next).toHaveProperty("disabled", false);
    fireEvent.click(next);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("shows the acceptance already given when stepping back", () => {
    render(
      <WizardHost>
        <LicenseAgreement accepted onAccept={() => {}} />
      </WizardHost>,
    );
    expect(
      screen.getByRole("radio", {
        name: "I accept the terms of the license agreement",
      }),
    ).toHaveProperty("checked", true);
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
