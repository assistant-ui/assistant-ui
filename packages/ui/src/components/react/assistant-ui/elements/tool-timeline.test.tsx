import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FileIcon, SearchIcon } from "lucide-react";

import { ToolTimeline, type TimelineStep } from "./tool-timeline";

// jsdom ships no ResizeObserver; surfaces.tsx's SwapLabel needs one to
// measure its own resting/active label swap - the same polyfill
// assistant-modal.aui.test.tsx already uses for the identical gap.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const STEPS: TimelineStep[] = [
  { verb: "Searched", chip: "src/**", icon: SearchIcon },
  { verb: "Read", chip: "thread.tsx", icon: FileIcon },
  { verb: "Edited", chip: "composer.tsx", icon: FileIcon },
];

describe("ToolTimeline", () => {
  it("lists the visible steps and file stats when open", () => {
    render(
      <ToolTimeline
        steps={STEPS}
        visibleSteps={2}
        streaming={false}
        open
        onOpenChange={() => {}}
        restingLabel="Worked for 12s"
        activeLabel="Working"
        stats={[{ file: "composer.tsx", added: 12, removed: 3 }]}
      />,
    );

    expect(screen.getByText("Searched")).toBeTruthy();
    expect(screen.getByText("src/**")).toBeTruthy();
    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.queryByText("Edited")).toBeNull();
    expect(screen.getByText("composer.tsx")).toBeTruthy();
    expect(screen.getByText("+12")).toBeTruthy();
    expect(screen.getByText("−3")).toBeTruthy();
  });

  it("collapses to the resting label and asks to open on click", () => {
    const onOpenChange = () => {
      called = true;
    };
    let called = false;

    render(
      <ToolTimeline
        steps={STEPS}
        visibleSteps={STEPS.length}
        streaming={false}
        open={false}
        onOpenChange={onOpenChange}
        restingLabel="Worked for 12s"
        activeLabel="Working"
        stats={[]}
      />,
    );

    const trigger = screen.getByText("Worked for 12s").closest("button")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Searched")).toBeNull();

    trigger.click();
    expect(called).toBe(true);
  });

  it("renders two steps with an identical chip as two separate rows, with no duplicate-key warning", () => {
    const duplicateChip: TimelineStep[] = [
      { verb: "Read", chip: "config.ts", icon: FileIcon },
      { verb: "Read", chip: "config.ts", icon: FileIcon },
    ];

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(
        <ToolTimeline
          steps={duplicateChip}
          visibleSteps={duplicateChip.length}
          streaming={false}
          open
          onOpenChange={() => {}}
          restingLabel="Worked for 4s"
          activeLabel="Working"
          stats={[]}
        />,
      );

      expect(screen.getAllByText("Read")).toHaveLength(2);
      expect(screen.getAllByText("config.ts")).toHaveLength(2);
      expect(
        errorSpy.mock.calls.some((call) =>
          String(call[0]).includes("same key"),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("preserves surviving rows and mounts the entering row when an identified window slides", () => {
    const steps: TimelineStep[] = Array.from({ length: 7 }, (_, index) => ({
      id: `s${index + 1}`,
      verb: "Read",
      chip: `file-${index + 1}.ts`,
      icon: FileIcon,
    }));
    const renderWindow = (window: TimelineStep[]) => (
      <ToolTimeline
        steps={window}
        visibleSteps={window.length}
        streaming={false}
        open
        onOpenChange={() => {}}
        restingLabel="Worked for 7s"
        activeLabel="Working"
        stats={[]}
      />
    );

    const { rerender } = render(renderWindow(steps.slice(0, 6)));
    const rows = steps
      .slice(0, 6)
      .map((step) => screen.getByText(step.chip).parentElement);

    rerender(renderWindow(steps.slice(1)));

    expect(screen.queryByText("file-1.ts")).toBeNull();
    for (let index = 1; index < 6; index++) {
      expect(screen.getByText(steps[index]!.chip).parentElement).toBe(
        rows[index],
      );
    }
    expect(screen.getByText("file-7.ts").parentElement).not.toBe(rows[0]);
  });
});
