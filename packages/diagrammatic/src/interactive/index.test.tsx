// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bar } from "../react/charts/bar";
import { Heatmap } from "../react/charts/heatmap";
import { Sankey } from "../react/charts/sankey";
import { Line } from "../react/charts/line";
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

  it("includes region annotations in highlight matching", () => {
    const { container } = render(
      <Interactive.Root highlight={{ series: "alt penalty" }}>
        <Line
          data={[1, 4, 3, 6, 5]}
          regions={[{ from: 1, to: 3, label: "alt penalty" }]}
        />
      </Interactive.Root>,
    );
    const region = container.querySelector('[data-part="region"]');
    expect(region?.hasAttribute("data-dg-active")).toBe(true);
    const marks = container.querySelectorAll('[data-part="mark"]');
    expect(marks[0]!.hasAttribute("data-dg-muted")).toBe(true);
  });

  it("highlightOnHover spotlights the hovered index and clears with grace", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <Interactive.Root data-testid="root" highlightOnHover>
          <Bar items={ITEMS} />
        </Interactive.Root>,
      );
      const bars = container.querySelectorAll('g[data-part="mark"]');
      fireEvent.pointerMove(bars[2]!, { clientX: 5, clientY: 5 });
      expect(bars[2]!.hasAttribute("data-dg-active")).toBe(true);
      expect(bars[0]!.hasAttribute("data-dg-muted")).toBe(true);

      fireEvent.pointerMove(screen.getByTestId("root"), {
        clientX: 2,
        clientY: 2,
      });
      expect(bars[2]!.hasAttribute("data-dg-active")).toBe(true);
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(bars[2]!.hasAttribute("data-dg-active")).toBe(false);
      expect(bars[0]!.hasAttribute("data-dg-muted")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("controlled highlight wins over highlightOnHover", () => {
    const { container } = render(
      <Interactive.Root
        data-testid="root"
        highlight={{ index: 0 }}
        highlightOnHover
      >
        <Bar items={ITEMS} />
      </Interactive.Root>,
    );
    const bars = container.querySelectorAll('g[data-part="mark"]');
    fireEvent.pointerMove(bars[2]!, { clientX: 5, clientY: 5 });
    expect(bars[0]!.hasAttribute("data-dg-active")).toBe(true);
    expect(bars[2]!.hasAttribute("data-dg-muted")).toBe(true);
  });

  it("line exposes one hit mark per data point", () => {
    const { container } = render(
      <Line
        series={[
          { name: "a", data: [1, 2, 3, 4] },
          { name: "b", data: [4, 3, 2, 1] },
        ]}
      />,
    );
    const hits = container.querySelectorAll('circle[data-part="mark"][data-i]');
    expect(hits).toHaveLength(8);
    expect(hits[0]!.getAttribute("data-series")).toBe("a");
    const datum = Interactive.getMarkDatum(hits[5]!);
    expect(datum).toMatchObject({ index: 1, series: "b" });
  });

  it("getSeriesColor resolves a series' rendered color from any element", () => {
    const { container } = render(
      <Line
        series={[
          { name: "a", data: [1, 2, 3] },
          { name: "b", data: [3, 2, 1] },
        ]}
      />,
    );
    const anyHit = container.querySelector('circle[data-part="mark"]')!;
    const color = Interactive.getSeriesColor(anyHit, "b");
    expect(color).toBeTruthy();
    expect(color).not.toBe("transparent");
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

describe("four-slot addressing", () => {
  it("heatmap cells decode to (column, row)", () => {
    const { container } = render(
      <Heatmap
        matrix={{
          rows: ["a", "b"],
          cols: ["x", "y", "z"],
          values: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        }}
      />,
    );
    const cells = container.querySelectorAll('[data-part="mark"][data-i2]');
    expect(cells.length).toBe(6);
    const datum = Interactive.getMarkDatum(cells[5]!);
    expect(datum).toMatchObject({ index: 2, index2: 1 });
  });

  it("sankey ribbons decode to (order, source, target)", () => {
    const { container } = render(
      <Sankey
        graph={{
          nodes: [{ id: "sun" }, { id: "wind" }, { id: "home" }],
          links: [
            { source: "sun", target: "home", value: 3 },
            { source: "wind", target: "home", value: 1 },
          ],
        }}
      />,
    );
    const ribbon = container.querySelector('[data-series2="home"]')!;
    const datum = Interactive.getMarkDatum(ribbon);
    expect(datum?.series).toBe("sun");
    expect(datum?.series2).toBe("home");
    expect(datum?.index).toBe(0);
  });

  it("highlight matches on any slot combination", () => {
    const { container, rerender } = render(
      <Interactive.Root highlight={{ index: 1, index2: 0 }}>
        <Heatmap
          matrix={{
            rows: ["a", "b"],
            cols: ["x", "y"],
            values: [
              [1, 2],
              [3, 4],
            ],
          }}
        />
      </Interactive.Root>,
    );
    const active = container.querySelectorAll("[data-dg-active]");
    expect(active.length).toBe(1);
    expect(active[0]!.getAttribute("data-i")).toBe("1");
    expect(active[0]!.getAttribute("data-i2")).toBe("0");

    rerender(
      <Interactive.Root highlight={{ series2: "home" }}>
        <Sankey
          graph={{
            nodes: [{ id: "sun" }, { id: "farm" }, { id: "home" }],
            links: [
              { source: "sun", target: "home", value: 2 },
              { source: "sun", target: "farm", value: 1 },
            ],
          }}
        />
      </Interactive.Root>,
    );
    const lit = container.querySelectorAll("[data-dg-active]");
    expect(lit.length).toBe(1);
    expect(lit[0]!.getAttribute("data-series2")).toBe("home");
  });
});

describe("resolvePlacement", () => {
  it("flips top to bottom when the tip would leave the container", () => {
    const flipped = Interactive.resolvePlacement(
      "top",
      50,
      20,
      10,
      60,
      40,
      200,
      150,
    );
    expect(flipped.top).toBe(30);
    const kept = Interactive.resolvePlacement(
      "top",
      50,
      120,
      10,
      60,
      40,
      200,
      150,
    );
    expect(kept.top).toBe(70);
  });

  it("clamps the crossing axis inside the container", () => {
    const nearRight = Interactive.resolvePlacement(
      "top",
      195,
      100,
      10,
      80,
      30,
      200,
      150,
    );
    expect(nearRight.left).toBe(200 - 80 - 2);
    const nearLeft = Interactive.resolvePlacement(
      "bottom",
      5,
      40,
      10,
      80,
      30,
      200,
      150,
    );
    expect(nearLeft.left).toBe(2);
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

  it("holds through gap sweeps and clears only after the grace period", () => {
    vi.useFakeTimers();
    try {
      const { container } = renderChart();
      const marks = container.querySelectorAll('[data-part="mark"]');
      fireEvent.pointerMove(marks[0]!, { clientX: 10, clientY: 10 });
      expect(screen.queryByRole("tooltip")).not.toBeNull();

      fireEvent.pointerMove(screen.getByTestId("root"), {
        clientX: 5,
        clientY: 5,
      });
      expect(screen.getByRole("tooltip").textContent).toBe("react");

      fireEvent.pointerMove(marks[1]!, { clientX: 20, clientY: 10 });
      vi.advanceTimersByTime(300);
      expect(screen.getByRole("tooltip").textContent).toBe("vue");

      fireEvent.pointerMove(screen.getByTestId("root"), {
        clientX: 5,
        clientY: 5,
      });
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.queryByRole("tooltip")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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
