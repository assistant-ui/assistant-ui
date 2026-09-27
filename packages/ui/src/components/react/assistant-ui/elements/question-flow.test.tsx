import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuestionFlow, type QuestionFlowStep } from "./question-flow";

afterEach(cleanup);

const STEPS: readonly QuestionFlowStep[] = [
  {
    id: "audience",
    question: "Who should receive this update?",
    options: [
      { id: "team", label: "The whole team" },
      { id: "leads", label: "Team leads" },
    ],
  },
  {
    id: "checks",
    question: "Which checks should run?",
    selectionMode: "multiple",
    minSelections: 1,
    options: [
      { id: "tests", label: "Unit tests" },
      { id: "types", label: "Typecheck" },
    ],
  },
  {
    id: "schedule",
    question: "When should it go out?",
    options: [
      { id: "today", label: "Today" },
      { id: "tomorrow", label: "Tomorrow" },
    ],
  },
];

function moveToLastStep(
  onComplete: (answers: Record<string, string[]>) => void | Promise<void>,
) {
  render(<QuestionFlow steps={STEPS} onComplete={onComplete} />);
  fireEvent.click(screen.getByRole("button", { name: "The whole team" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Unit tests" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("QuestionFlow", () => {
  it("advances a single selection on pick", () => {
    render(<QuestionFlow steps={STEPS} onComplete={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "The whole team" }));

    expect(screen.getByText("Which checks should run?")).toBeTruthy();
    expect(screen.getByText("2 of 3")).toBeTruthy();
  });

  it("keeps answers when going back and preselects them", () => {
    render(<QuestionFlow steps={STEPS} onComplete={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "The whole team" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(
      screen.getByRole("button", { name: "The whole team" }).className,
    ).toContain("bg-foreground/[0.06]");
  });

  it("requires Next for a multiple selection", () => {
    render(<QuestionFlow steps={STEPS} onComplete={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "The whole team" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Unit tests" }));

    expect(screen.queryByText("When should it go out?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("When should it go out?")).toBeTruthy();
  });

  it("completes with every answer and shows a receipt after pending", async () => {
    let resolve: (() => void) | undefined;
    const onComplete = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    moveToLastStep(onComplete);

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith({
      audience: ["team"],
      checks: ["tests"],
      schedule: ["today"],
    });
    expect(screen.getByRole("group").getAttribute("aria-busy")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Back" }).getAttribute("disabled"),
    ).toBe("");

    await act(async () => {
      resolve?.();
    });

    expect(
      screen
        .getByText("Today")
        .closest('[data-slot="question-flow"]')
        ?.getAttribute("data-state"),
    ).toBe("receipt");
    expect(screen.getByText("The whole team")).toBeTruthy();
    expect(screen.getByText("Unit tests")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("reopens the final question with the completion error", async () => {
    const onComplete = vi
      .fn<(answers: Record<string, string[]>) => Promise<void>>()
      .mockRejectedValueOnce(new Error("The update could not be scheduled"));
    moveToLastStep(onComplete);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Today" }));
    });

    expect(screen.getByRole("alert").textContent).toBe(
      "The update could not be scheduled",
    );
    expect(screen.getByRole("group").getAttribute("aria-busy")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Back" }).getAttribute("disabled"),
    ).toBeNull();
  });

  it("renders supplied answers as a receipt", () => {
    render(
      <QuestionFlow
        data-testid="flow"
        steps={STEPS}
        choice={{ audience: ["leads"], checks: ["tests", "types"] }}
      />,
    );

    const flow = screen.getByTestId("flow");
    expect(flow.getAttribute("data-state")).toBe("receipt");
    expect(screen.getByText("Team leads")).toBeTruthy();
    expect(screen.getByText("Unit tests, Typecheck")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("displays every step without controls when it has no completion handler", () => {
    render(<QuestionFlow data-testid="flow" steps={STEPS} />);

    expect(screen.getByText("Who should receive this update?")).toBeTruthy();
    expect(screen.getByText("Which checks should run?")).toBeTruthy();
    expect(screen.getByText("When should it go out?")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByTestId("flow").getAttribute("data-state")).toBe("open");
  });

  it("announces progress for the current question", () => {
    render(<QuestionFlow steps={STEPS} onComplete={() => {}} />);

    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-valuemin")).toBe("1");
    expect(progress.getAttribute("aria-valuemax")).toBe("3");
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuetext")).toBe("Question 1 of 3");
  });
});
