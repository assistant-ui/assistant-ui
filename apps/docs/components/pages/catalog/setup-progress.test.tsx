// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { initialCheckoutState } from "../../../lib/checkout/protocol";
import { SetupProgress } from "./setup-progress";

afterEach(cleanup);

describe("SetupProgress", () => {
  it("uses action labels for upcoming steps and an ongoing label for the current step", () => {
    render(<SetupProgress state={undefined} ordered={false} />);

    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.querySelector("p")?.textContent),
    ).toEqual([
      "Ordering",
      "Connect agent",
      "Plan",
      "Build",
      "Test and Approve",
      "Complete",
    ]);
  });

  it("waits for the agent after an order is placed", () => {
    render(<SetupProgress state={undefined} ordered />);

    expect(
      screen
        .getByText("Connecting agent")
        .closest("li")
        ?.getAttribute("aria-current"),
    ).toBe("step");
    expect(screen.getAllByText("Completed")).toHaveLength(1);
  });

  it("does not label the plan as started while a connected agent waits for the user", () => {
    const state = initialCheckoutState();
    state.agent.lastSeenAt = 1;
    state.agent.connected = true;
    render(<SetupProgress state={state} ordered />);
    expect(screen.getByText("Agent connected")).toBeDefined();
    expect(screen.getByText("Plan").closest("li")?.textContent).toContain(
      "Pending",
    );
    expect(screen.queryByText("Planning")).toBeNull();
  });

  it("preserves the connection milestone when the agent disconnects", () => {
    const state = initialCheckoutState();
    state.status = "installing";
    state.agent.lastSeenAt = 1;
    state.agent.connected = false;
    state.plans = [
      {
        revision: 1,
        markdown: "Install the components.",
        status: "approved",
        submittedAt: 1,
      },
    ];
    render(<SetupProgress state={state} ordered />);

    expect(
      screen.getByText("Building").closest("li")?.getAttribute("aria-current"),
    ).toBe("step");
    expect(screen.getAllByText("Completed")).toHaveLength(3);
  });

  it.each([undefined, "proposed", "changes-requested"] as const)(
    "keeps planning active until approval (plan: %s)",
    (status) => {
      const state = initialCheckoutState();
      state.status = "planning";
      state.agent.lastSeenAt = 1;
      if (status !== undefined) {
        state.plans = [
          {
            revision: 1,
            markdown: "Install the components.",
            status,
            submittedAt: 1,
          },
        ];
      }
      const { rerender } = render(<SetupProgress state={state} ordered />);

      expect(
        screen
          .getByText("Planning")
          .closest("li")
          ?.getAttribute("aria-current"),
      ).toBe("step");
      expect(
        screen.getByText("Planning").closest("li")?.textContent,
      ).not.toContain("Completed");

      rerender(
        <SetupProgress
          state={{
            ...state,
            status: "installing",
            plans: [
              {
                revision: 1,
                markdown: "Install the components.",
                status: "approved",
                submittedAt: 1,
              },
            ],
          }}
          ordered
        />,
      );

      expect(
        screen.getByText("Plan approved").closest("li")?.textContent,
      ).toContain("Completed");
      expect(
        screen
          .getByText("Building")
          .closest("li")
          ?.getAttribute("aria-current"),
      ).toBe("step");
    },
  );

  it("does not infer testing or final approval from agent completion", () => {
    const state = initialCheckoutState();
    state.status = "done";
    state.agent.lastSeenAt = 1;
    state.plans = [
      {
        revision: 1,
        markdown: "Install the components.",
        status: "approved",
        submittedAt: 1,
      },
    ];
    render(<SetupProgress state={state} ordered />);

    expect(
      screen.getByText("Test and Approve").closest("li")?.textContent,
    ).toContain("Not recorded");
    expect(screen.getAllByText("Completed")).toHaveLength(5);
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("does not show an active stage after cancellation", () => {
    const state = initialCheckoutState();
    state.status = "cancelled";
    render(<SetupProgress state={state} ordered />);

    expect(screen.getByText("Cancelled")).toBeDefined();
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    expect(screen.getAllByText("Completed")).toHaveLength(1);
  });
});
