import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentPlan } from "./agent-plan";

afterEach(cleanup);

describe("AgentPlan", () => {
  it("uses Plan by default and accepts a custom title", () => {
    const { rerender } = render(<AgentPlan steps={["Read"]} activeIndex={0} />);

    expect(screen.getByText("Plan")).toBeTruthy();

    rerender(
      <AgentPlan title="Release checklist" steps={["Read"]} activeIndex={0} />,
    );

    expect(screen.getByText("Release checklist")).toBeTruthy();
  });

  it("shows a description only for the active object step", () => {
    render(
      <AgentPlan
        activeIndex={1}
        steps={[
          { id: "read", label: "Read", description: "Inspect the brief" },
          { id: "write", label: "Write", description: "Draft the response" },
          { id: "test", label: "Test", description: "Run the checks" },
        ]}
      />,
    );

    expect(screen.queryByText("Inspect the brief")).toBeNull();
    expect(screen.getByText("Draft the response")).toBeTruthy();
    expect(screen.queryByText("Run the checks")).toBeNull();
  });

  it("keeps object rows with duplicate labels distinct by id", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <AgentPlan
        activeIndex={0}
        steps={[
          { id: "first", label: "Review" },
          { id: "second", label: "Review" },
        ]}
      />,
    );

    expect(screen.getAllByText("Review")).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("exposes rounded progress with the completed-step count", () => {
    render(
      <AgentPlan
        title="Release checklist"
        steps={["Read", "Write", "Test"]}
        activeIndex={1}
      />,
    );

    const progress = screen.getByRole("progressbar", {
      name: "Release checklist progress",
    });
    expect(progress.getAttribute("aria-valuemin")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("100");
    expect(progress.getAttribute("aria-valuenow")).toBe("33.3");
    expect(progress.getAttribute("aria-valuetext")).toBe("1 of 3 steps");
  });

  it("announces each step status", () => {
    render(<AgentPlan steps={["Read", "Write", "Test"]} activeIndex={1} />);

    expect(screen.getAllByText("done")).toHaveLength(1);
    expect(screen.getAllByText("in progress")).toHaveLength(1);
    expect(screen.getAllByText("not started")).toHaveLength(1);
  });
});
