// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_REOPEN_EVENT } from "@/lib/consent";
import { LegalLinks } from "./legal-links";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "globalPrivacyControl");
});

describe("LegalLinks", () => {
  it("links privacy and terms next to cookie settings", () => {
    const { container } = render(<LegalLinks />);

    expect(
      screen.getByRole("link", { name: "Privacy" }).getAttribute("href"),
    ).toBe("/privacy-policy");
    expect(
      screen.getByRole("link", { name: "Terms" }).getAttribute("href"),
    ).toBe("/terms-of-service");
    expect(
      screen.getByRole("button", { name: "Cookie settings" }),
    ).toBeTruthy();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it("reopens the consent banner from cookie settings", () => {
    const reopened = vi.fn();
    window.addEventListener(CONSENT_REOPEN_EVENT, reopened);
    render(<LegalLinks />);

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    window.removeEventListener(CONSENT_REOPEN_EVENT, reopened);

    expect(reopened).toHaveBeenCalledTimes(1);
  });

  it("drops cookie settings and its separator under Global Privacy Control", () => {
    Object.defineProperty(navigator, "globalPrivacyControl", {
      configurable: true,
      value: true,
    });
    const { container } = render(<LegalLinks />);

    expect(
      screen.queryByRole("button", { name: "Cookie settings" }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "Terms" })).toBeTruthy();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });
});
