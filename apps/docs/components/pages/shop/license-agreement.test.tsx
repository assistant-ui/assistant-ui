// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LICENSE_TEXT, LicenseAgreement } from "./license-agreement";
import { WizardHost } from "./test/wizard-host";

afterEach(cleanup);

describe("LicenseAgreement", () => {
  it("shows the repository LICENSE, paragraph for paragraph", () => {
    const file = readFileSync(
      resolve(__dirname, "../../../../../LICENSE"),
      "utf8",
    );
    expect(LICENSE_TEXT).toBe(file.trim().replace(/([^\n])\n(?!\n)/g, "$1 "));
  });

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

  it("shows the acceptance already given, read-only, when stepping back", () => {
    render(
      <WizardHost>
        <LicenseAgreement accepted onAccept={() => {}} />
      </WizardHost>,
    );
    const accept = screen.getByRole("radio", {
      name: "I accept the terms of the license agreement",
    });
    expect(accept).toHaveProperty("checked", true);
    expect(accept.closest("fieldset")).toHaveProperty("disabled", true);
    expect(screen.getByRole("status").textContent).toContain(
      "accepted the agreement earlier",
    );
    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
