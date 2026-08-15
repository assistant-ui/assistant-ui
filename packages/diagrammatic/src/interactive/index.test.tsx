// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Bar } from "../react/charts/bar";
import * as Interactive from "./index";

const ITEMS = [
  { label: "react", value: 25 },
  { label: "vue", value: 12 },
  { label: "svelte", value: 6 },
];

function renderChart() {
  return render(
    <Interactive.Root data-testid="root">
      <Bar items={ITEMS} />
      <Interactive.Tooltip data-testid="tooltip">
        {({ datum }) => (
          <span>
            {datum.index !== undefined ? ITEMS[datum.index]?.label : "?"}
          </span>
        )}
      </Interactive.Tooltip>
    </Interactive.Root>,
  );
}

afterEach(cleanup);

describe("Interactive.Root + Tooltip", () => {
  it("shows the hovered mark's datum and hides on leave", () => {
    const { container } = renderChart();
    expect(screen.queryByRole("tooltip")).toBeNull();

    const marks = container.querySelectorAll('[data-part="mark"]');
    expect(marks.length).toBeGreaterThan(0);
    fireEvent.pointerMove(marks[1]!, { clientX: 40, clientY: 30 });

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toBe("vue");
    expect(tooltip.style.pointerEvents).toBe("none");

    fireEvent.pointerLeave(screen.getByTestId("root"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("clears when the pointer moves off the marks", () => {
    const { container } = renderChart();
    const marks = container.querySelectorAll('[data-part="mark"]');
    fireEvent.pointerMove(marks[0]!, { clientX: 10, clientY: 10 });
    expect(screen.queryByRole("tooltip")).not.toBeNull();

    fireEvent.pointerMove(screen.getByTestId("root"), {
      clientX: 5,
      clientY: 5,
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("places by side and merges consumer style", () => {
    const { container } = render(
      <Interactive.Root>
        <Bar items={ITEMS} />
        <Interactive.Tooltip side="bottom" sideOffset={4} style={{ zIndex: 9 }}>
          {({ datum }) => <span>{datum.series ?? datum.index}</span>}
        </Interactive.Tooltip>
      </Interactive.Root>,
    );
    const mark = container.querySelector('[data-part="mark"]')!;
    fireEvent.pointerMove(mark, { clientX: 20, clientY: 12 });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.transform).toBe("translate(-50%, 0)");
    expect(tooltip.style.top).toBe("16px");
    expect(tooltip.style.zIndex).toBe("9");
  });

  it("keeps the chart itself free of client wiring", () => {
    const { container } = renderChart();
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("data-dg")).toBe("");
  });
});
