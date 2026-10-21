// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { rememberCloudLogin } from "@/lib/checkout/cloud-login";
import { InputCard } from "./input-card";
import { WizardHost } from "./test/wizard-host";

const attempt = "4787798b-d33b-4329-b3d7-ad87ba1687fd";
const input = (): Checkout.Input => ({
  id: "q1",
  kind: "text",
  preset: "assistant-ui-cli-login",
  phase: "planning",
  prompt: "Sign in to Assistant Cloud",
  optional: false,
  status: "open",
  createdAt: 1,
  help: {
    summary: "Sign in",
    href: `https://accounts.assistant-ui.com/device?user_code=ABCD-EFGH&setup_attempt=${attempt}&setup_expires=${Date.now() + 60_000}`,
  },
});
const checkout = (dismiss = vi.fn().mockResolvedValue(undefined)) =>
  ({
    state: undefined,
    session: { id: "session", products: ["cloud"], startedAt: 1 },
    url: "https://checkout.test/session",
    agentPresent: true,
    degraded: false,
    openInputs: [],
    plan: undefined,
    planPending: false,
    progress: { done: 0, total: 0 },
    attentionKey: "",
    connection: {} as CheckoutContextValue["connection"],
    commands: {
      "checkout/dismiss": dismiss,
    } as unknown as CheckoutContextValue["commands"],
  }) satisfies CheckoutContextValue;
const show = (request: Checkout.Input, context = checkout()) =>
  render(
    <WizardHost>
      <InputCard input={request} checkout={context} />
    </WizardHost>,
  );
afterEach(() => {
  cleanup();
  window.location.hash = "";
  window.sessionStorage.clear();
});
describe("CloudLoginInputCard", () => {
  it("shows the exact approval code and trusted host, without asking for a token", () => {
    show(input());
    expect(screen.getByLabelText("Sign-in code").textContent).toBe("ABCD-EFGH");
    expect(screen.getByText("accounts.assistant-ui.com")).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Sign in" })
        .disabled,
    ).toBe(false);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("treats a bound return as waiting, never as an authenticated answer", async () => {
    const request = input();
    rememberCloudLogin(request, "session", window.sessionStorage);
    window.location.hash = `setup-login=${attempt}`;
    show(request);
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", {
          name: "Waiting for CLI",
        }).disabled,
      ).toBe(true),
    );
    expect(
      screen.getByText("Waiting for your CLI to finish sign-in."),
    ).toBeTruthy();
    expect(screen.queryByText(/signed in|authenticated/i)).toBeNull();
  });
  it("ignores a forged return that this tab did not start", () => {
    window.location.hash = `setup-login=${attempt}`;
    show(input());
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Sign in" })
        .disabled,
    ).toBe(false);
    expect(
      screen.queryByText("Waiting for your CLI to finish sign-in."),
    ).toBeNull();
  });
  it("refuses navigation when the checkout cannot be restored, even with session storage available", () => {
    show(input());
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Allow browser storage",
    );
    expect(window.sessionStorage.length).toBe(0);
  });
  it("blocks unsafe reserved inputs instead of rendering a generic secret field", () => {
    const request = input();
    request.help!.href = "https://evil.test/device";
    show(request);
    expect(screen.getByRole("alert").textContent).toContain("invalid");
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Sign in" })
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("blocks expired codes and lets the user cancel the login", async () => {
    const request = input();
    request.help!.href = request.help!.href!.replace(
      /setup_expires=\d+/,
      "setup_expires=1000000000000",
    );
    const dismiss = vi.fn().mockResolvedValue(undefined);
    show(request, checkout(dismiss));
    expect(screen.getByRole("status").textContent).toContain("expired");
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Sign in" })
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel sign-in" }));
    await waitFor(() =>
      expect(dismiss).toHaveBeenCalledWith({ inputId: "q1" }),
    );
  });
});
