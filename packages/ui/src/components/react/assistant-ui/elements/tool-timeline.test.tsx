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

  // Two steps in the same turn can carry an identical chip (two reads
  // reported with the same label, e.g.) - each must still render as its
  // own row, not merge or drop one. A single static render can't tell a
  // correct index key apart from a colliding chip key: React mounts a
  // fiber per array entry either way, so `getAllByText` sees two rows
  // under both implementations. What does distinguish them is React's
  // own duplicate-key validation, which runs on every render (mount
  // included) and warns via console.error whenever two siblings in the
  // same array share a key - exactly the case `key={step.chip}` produces
  // here and `key={index}` does not.
  it("renders two steps with an identical chip as two separate rows, with no duplicate-key warning", () => {
    const duplicateChip: TimelineStep[] = [
      { verb: "Read", chip: "config.ts", icon: FileIcon },
      { verb: "Read", chip: "config.ts", icon: FileIcon },
    ];

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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
      errorSpy.mock.calls.some((call) => String(call[0]).includes("same key")),
    ).toBe(false);

    errorSpy.mockRestore();
  });
});
