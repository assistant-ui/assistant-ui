import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JobProgress, type JobStage } from "./job-progress";

afterEach(cleanup);

const STAGES: readonly JobStage[] = [
  { name: "Clone", weight: 1, description: "Getting the source" },
  { name: "Install", weight: 2, description: "Installing packages" },
];

const props = {
  title: "Verify the fix",
  stages: STAGES,
  stageIndex: 0,
  stageProgress: 0.5,
  eta: "2m",
};

describe("JobProgress", () => {
  it.each([
    ["success", "done"],
    ["partial", "partial"],
    ["failed", "failed"],
    ["cancelled", "cancelled"],
  ] as const)("renders a %s outcome receipt", (status, word) => {
    const { container } = render(
      <JobProgress
        {...props}
        onCancel={() => undefined}
        outcome={{ status, summary: "The job has a receipt" }}
      />,
    );

    expect(
      container
        .querySelector('[data-slot="job-progress"]')
        ?.getAttribute("data-state"),
    ).toBe(status);
    expect(screen.getByText(word)).toBeTruthy();
    expect(screen.getByText("The job has a receipt")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel the job" })).toBeNull();
  });

  it("only renders cancellation when a running job supplies a handler", () => {
    const { rerender } = render(<JobProgress {...props} />);

    expect(screen.queryByRole("button", { name: "Cancel the job" })).toBeNull();

    rerender(<JobProgress {...props} onCancel={() => undefined} />);

    expect(screen.getByRole("button", { name: "Cancel the job" })).toBeTruthy();
  });

  it("shows only the current stage description", () => {
    render(<JobProgress {...props} stageIndex={1} />);

    expect(screen.getByText("Installing packages")).toBeTruthy();
    expect(screen.queryByText("Getting the source")).toBeNull();
  });

  it("shows elapsed time for a finished job", () => {
    render(
      <JobProgress {...props} stageIndex={STAGES.length} elapsedMs={72_000} />,
    );

    const elapsed = screen.getByText("1m 12s");
    expect(elapsed.tagName).toBe("TIME");
    expect(elapsed.getAttribute("dateTime")).toBe("PT72S");
  });

  it("announces the current stage", () => {
    const { rerender } = render(<JobProgress {...props} />);

    expect(screen.getByRole("status").textContent).toBe("Current stage: Clone");

    rerender(<JobProgress {...props} stageIndex={1} />);

    expect(screen.getByRole("status").textContent).toBe(
      "Current stage: Install",
    );
  });

  it("keeps the reached progress on a non-success outcome, and fills to 100 only on success", () => {
    const stages: readonly JobStage[] = [
      { name: "Clone", weight: 1 },
      { name: "Install", weight: 1 },
    ];
    const { container, rerender } = render(
      <JobProgress
        title="Verify the fix"
        stages={stages}
        stageIndex={1}
        stageProgress={0.5}
        eta="2m"
        outcome={{ status: "failed" }}
      />,
    );
    const bar = container.querySelector('[role="progressbar"]')!;
    const fill = bar.firstElementChild as HTMLElement;

    expect(bar.getAttribute("aria-valuenow")).toBe("75");
    expect(fill.style.width).toBe("75%");

    rerender(
      <JobProgress
        title="Verify the fix"
        stages={stages}
        stageIndex={1}
        stageProgress={0.5}
        eta="2m"
        outcome={{ status: "success" }}
      />,
    );

    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(fill.style.width).toBe("100%");
  });

  it("does not mark the root aria-busy while running", () => {
    const { container } = render(<JobProgress {...props} />);

    expect(
      container
        .querySelector('[data-slot="job-progress"]')
        ?.hasAttribute("aria-busy"),
    ).toBe(false);
  });
});
