import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolTimeline, type TimelineStep } from "./tool-timeline";

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon = (name: string) => () =>
    React.createElement(View, { testID: name });

  return {
    ChevronRightIcon: icon("ChevronRightIcon"),
    FileIcon: icon("FileIcon"),
    SearchIcon: icon("SearchIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("ToolTimeline", () => {
  let container: HTMLDivElement;
  let root: Root;
  let steps: TimelineStep[];

  beforeEach(async () => {
    const { FileIcon, SearchIcon } = await import("lucide-react-native");
    steps = [
      { verb: "Searched", chip: "src/**", icon: SearchIcon },
      { verb: "Read", chip: "thread.tsx", icon: FileIcon },
      { verb: "Edited", chip: "composer.tsx", icon: FileIcon },
    ];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async (
    props: Partial<Parameters<typeof ToolTimeline>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ToolTimeline
          steps={steps}
          visibleSteps={steps.length}
          streaming={false}
          open={false}
          onOpenChange={() => {}}
          restingLabel="Worked for 12s"
          activeLabel="Working"
          stats={[{ file: "composer.tsx", added: 12, removed: 3 }]}
          {...props}
        />,
      );
    });
  };

  it("collapses to the resting label and asks to open on press", async () => {
    const onOpenChange = vi.fn();
    await render({ onOpenChange });

    const trigger = container.querySelector('[aria-label="Worked for 12s"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Searched");

    await act(async () => {
      click(trigger as Element);
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("lists the visible steps and file stats when open", async () => {
    await render({ open: true, visibleSteps: 2 });

    expect(
      container
        .querySelector('[aria-label="Worked for 12s"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
    expect(container.textContent).toContain("Searched");
    expect(container.textContent).toContain("src/**");
    expect(container.textContent).toContain("Read");
    expect(container.textContent).not.toContain("Edited");
    expect(container.textContent).toContain("composer.tsx");
    expect(container.textContent).toContain("+12");
    expect(container.textContent).toContain("−3");
  });

  it("switches to the active label while streaming", async () => {
    await render({ streaming: true });

    expect(container.querySelector('[aria-label="Working"]')).not.toBeNull();
    expect(container.textContent).toContain("Working");
    expect(container.textContent).not.toContain("Worked for 12s");
  });
});
