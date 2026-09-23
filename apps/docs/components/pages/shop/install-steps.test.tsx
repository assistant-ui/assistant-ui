// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InstallSteps } from "./install-steps";
import {
  initialCheckoutState,
  type Checkout,
} from "../../../lib/checkout/protocol";
import type { CheckoutContextValue } from "../../shared/checkout-provider";

afterEach(cleanup);

const stateWithSteps = (): Checkout.State => ({
  ...initialCheckoutState(),
  status: "installing",
  steps: [
    {
      id: "s1",
      title: "Create the app",
      detail: "Install dependencies",
      status: "done",
      createdAt: 1,
    },
    {
      id: "s2",
      title: "Configure the model",
      detail: "Use your chosen provider",
      status: "active",
      createdAt: 2,
    },
    {
      id: "s3",
      title: "Run checks",
      detail: "Check types and lint",
      status: "pending",
      createdAt: 3,
    },
  ],
});
const checkout = (openInputs: Checkout.Input[] = []) =>
  ({ openInputs }) as CheckoutContextValue;

describe("InstallSteps", () => {
  it("shows a compact task list with accessible statuses and expandable details", () => {
    render(<InstallSteps state={stateWithSteps()} checkout={checkout()} />);
    expect(screen.getByText("1 of 3 completed")).toBeDefined();
    expect(
      within(
        screen.getByRole("list", { name: "Installation steps" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Create the app: done" }),
    ).toBeDefined();
    const active = screen.getByRole("button", {
      name: "Configure the model: in progress",
    });
    expect(active.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(active);
    expect(active.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Use your chosen provider")).toBeDefined();
    fireEvent.click(active);
    expect(active.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByRole("button", { name: "Run checks: pending" }),
    ).toBeDefined();
  });

  it("reveals a new blocker and uses its latest note", () => {
    const state = stateWithSteps();
    const { rerender } = render(
      <InstallSteps state={state} checkout={checkout()} />,
    );
    state.steps[1] = {
      ...state.steps[1]!,
      status: "blocked",
      note: "An API key is needed",
    };
    rerender(<InstallSteps state={state} checkout={checkout()} />);
    expect(
      screen
        .getByRole("button", { name: "Configure the model: blocked" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("An API key is needed")).toBeDefined();
    expect(screen.queryByText("Use your chosen provider")).toBeNull();
  });

  it("marks required input on live steps but not a closed setup", () => {
    const state = stateWithSteps();
    const value = checkout([
      {
        id: "q1",
        stepId: "s2",
        kind: "text",
        phase: "installing",
        prompt: "Which model?",
        optional: false,
        status: "open",
        createdAt: 4,
      },
    ]);
    const { rerender } = render(
      <InstallSteps state={state} checkout={value} />,
    );
    expect(
      screen
        .getByRole("button", { name: "Configure the model: needs your input" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    rerender(
      <InstallSteps
        state={{ ...state, status: "cancelled" }}
        checkout={value}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /needs your input/ }),
    ).toBeNull();
  });

  it("preserves product grouping and does not add an empty disclosure", () => {
    const state = stateWithSteps();
    state.products = [
      { slug: "assistant-ui", name: "assistant-ui" },
      { slug: "cloud", name: "Cloud" },
    ];
    state.steps = [
      {
        id: "s1",
        title: "Install chat",
        status: "skipped",
        product: "assistant-ui",
        createdAt: 1,
      },
    ];
    render(<InstallSteps state={state} checkout={checkout()} />);
    expect(screen.getByText("assistant-ui")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(": skipped")).toBeDefined();
  });
});
