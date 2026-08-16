// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
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

describe("highlight", () => {
  it("stamps active on matching marks and muted on the rest", () => {
    const { container } = render(
      <Interactive.Root highlight={{ index: 1 }}>
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    const marks = container.querySelectorAll('[data-part="mark"]');
    expect(marks[1]!.hasAttribute("data-dg-active")).toBe(true);
    expect(marks[1]!.hasAttribute("data-dg-muted")).toBe(false);
    expect(marks[0]!.hasAttribute("data-dg-muted")).toBe(true);
    expect(marks[2]!.hasAttribute("data-dg-muted")).toBe(true);
  });

  it("matches by series, accepts arrays, and clears on null", () => {
    const { container, rerender } = render(
      <Interactive.Root highlight={[{ index: 0 }, { index: 2 }]}>
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    const marks = container.querySelectorAll('[data-part="mark"]');
    expect(marks[0]!.hasAttribute("data-dg-active")).toBe(true);
    expect(marks[2]!.hasAttribute("data-dg-active")).toBe(true);
    expect(marks[1]!.hasAttribute("data-dg-muted")).toBe(true);

    rerender(
      <Interactive.Root highlight={null}>
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    for (const mark of marks) {
      expect(mark.hasAttribute("data-dg-active")).toBe(false);
      expect(mark.hasAttribute("data-dg-muted")).toBe(false);
    }
  });

  it("round-trips: onMarkHover drives a controlled highlight", () => {
    function Cross() {
      const [hl, setHl] = React.useState<Interactive.MarkQuery | null>(null);
      return (
        <Interactive.Root
          data-testid="root"
          highlight={hl}
          onMarkHover={(datum) =>
            setHl(datum?.index === undefined ? null : { index: datum.index })
          }
        >
          <Bar items={ITEMS} />
        </Interactive.Root>
      );
    }
    const { container } = render(<Cross />);
    const marks = container.querySelectorAll('[data-part="mark"]');
    fireEvent.pointerMove(marks[2]!, { clientX: 5, clientY: 5 });
    expect(marks[2]!.hasAttribute("data-dg-active")).toBe(true);
    expect(marks[0]!.hasAttribute("data-dg-muted")).toBe(true);
    fireEvent.pointerLeave(screen.getByTestId("root"));
    expect(marks[0]!.hasAttribute("data-dg-muted")).toBe(false);
  });
});

describe("mark actions", () => {
  it("fires onMarkClick with the mark's datum and skips empty space", () => {
    const clicks: Interactive.MarkDatum[] = [];
    const { container } = render(
      <Interactive.Root
        data-testid="root"
        onMarkClick={(datum) => clicks.push(datum)}
      >
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    const marks = container.querySelectorAll('[data-part="mark"]');
    fireEvent.click(marks[2]!);
    expect(clicks).toHaveLength(1);
    expect(clicks[0]!.index).toBe(2);
    expect(clicks[0]!.element).toBe(marks[2]);

    fireEvent.click(screen.getByTestId("root"));
    expect(clicks).toHaveLength(1);
  });

  it("fires onMarkHover once per mark and null on leave", () => {
    const hovers: (number | null | undefined)[] = [];
    const { container } = render(
      <Interactive.Root
        data-testid="root"
        onMarkHover={(datum) => hovers.push(datum ? datum.index : null)}
      >
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    const marks = container.querySelectorAll('[data-part="mark"]');
    fireEvent.pointerMove(marks[0]!, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(marks[0]!, { clientX: 6, clientY: 6 });
    fireEvent.pointerMove(marks[1]!, { clientX: 7, clientY: 7 });
    fireEvent.pointerLeave(screen.getByTestId("root"));
    expect(hovers).toEqual([0, 1, null]);
  });

  it("shows a pointer cursor over marks only while onMarkClick is provided", () => {
    const { container } = render(
      <Interactive.Root data-testid="root" onMarkClick={() => {}}>
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    const root = screen.getByTestId("root");
    expect(root.style.cursor).toBe("");
    const marks = container.querySelectorAll('[data-part="mark"]');
    fireEvent.pointerMove(marks[0]!, { clientX: 5, clientY: 5 });
    expect(root.style.cursor).toBe("pointer");
  });

  it("getMarkDatum decodes any event target without the wrapper", () => {
    const { container } = render(<Bar items={ITEMS} />);
    const mark = container.querySelectorAll('[data-part="mark"]')[1]!;
    const datum = Interactive.getMarkDatum(mark.firstElementChild ?? mark);
    expect(datum?.index).toBe(1);
    expect(Interactive.getMarkDatum(container.firstElementChild)).toBeNull();
    expect(Interactive.getMarkDatum(null)).toBeNull();
  });
});

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
