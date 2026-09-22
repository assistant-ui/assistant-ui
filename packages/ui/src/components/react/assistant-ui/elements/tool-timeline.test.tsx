import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { FileIcon, SearchIcon } from "lucide-react";

import { ToolTimeline, type TimelineStep } from "./tool-timeline";

// jsdom ships no ResizeObserver; surfaces.tsx's ShimmerLabel needs one
// to measure its own shimmering label - the same polyfill
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

  // A review caught this: `key={step.chip}` collided when two steps in
  // the same turn carried the identical chip text (two reads reported
  // with the same label, e.g.) - the same class of bug `elements/
  // sources.tsx` already fixed for `source.domain` (assistant-ui/
  // assistant-ui#7962). Two steps sharing a chip must both render as
  // their own row, not merge or drop one.
  it("renders two steps with an identical chip as two separate rows, not one", () => {
    const duplicateChip: TimelineStep[] = [
      { verb: "Read", chip: "config.ts", icon: FileIcon },
      { verb: "Read", chip: "config.ts", icon: FileIcon },
    ];

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
  });
});
