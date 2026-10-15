// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { useState, version } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Line } from "../react/charts/line";
import { Root } from "./root";
import { Tooltip } from "./tooltip";

afterEach(cleanup);

const onReact18 = version.startsWith("18.");

describe("Interactive.Root highlight after rerender", () => {
  it.skipIf(onReact18)(
    "preserves root and tooltip callback ref cleanups across rerenders",
    () => {
      const rootCleanup = vi.fn();
      const tooltipCleanup = vi.fn();
      const rootRef = vi.fn((node: HTMLDivElement | null) =>
        node ? rootCleanup : undefined,
      );
      const tooltipRef = vi.fn((node: HTMLDivElement | null) =>
        node ? tooltipCleanup : undefined,
      );
      const view = render(
        <Root ref={rootRef}>
          <Line data={[1, 2, 3]} />
          <Tooltip ref={tooltipRef}>
            {({ datum }) => <span>{datum.index}</span>}
          </Tooltip>
        </Root>,
      );
      const marks = view.container.querySelectorAll(
        'circle[data-part="mark"][data-i]',
      );

      fireEvent.pointerMove(marks[0]!, { clientX: 5, clientY: 5 });
      expect(tooltipRef).toHaveBeenCalledOnce();
      fireEvent.pointerMove(marks[1]!, { clientX: 10, clientY: 10 });
      expect(tooltipRef).toHaveBeenCalledOnce();
      expect(tooltipCleanup).not.toHaveBeenCalled();

      view.unmount();
      expect(rootRef).toHaveBeenCalledOnce();
      expect(rootCleanup).toHaveBeenCalledOnce();
      expect(tooltipRef).toHaveBeenCalledOnce();
      expect(tooltipCleanup).toHaveBeenCalledOnce();
    },
  );

  it("forwards null to callback refs that return no cleanup", () => {
    const rootCalls: (HTMLDivElement | null)[] = [];
    const tooltipCalls: (HTMLDivElement | null)[] = [];
    const view = render(
      <Root
        ref={(node) => {
          rootCalls.push(node);
        }}
      >
        <Line data={[1, 2]} />
        <Tooltip
          ref={(node) => {
            tooltipCalls.push(node);
          }}
        >
          {({ datum }) => <span>{datum.index}</span>}
        </Tooltip>
      </Root>,
    );
    const mark = view.container.querySelector('circle[data-part="mark"]')!;
    fireEvent.pointerMove(mark, { clientX: 5, clientY: 5 });
    expect(tooltipCalls[0]).toBeInstanceOf(HTMLDivElement);

    view.unmount();
    expect(rootCalls[0]).toBeInstanceOf(HTMLDivElement);
    expect(rootCalls[1]).toBeNull();
    expect(tooltipCalls[1]).toBeNull();
  });

  it("stamps marks added by a child without rerendering Root", async () => {
    function LiveLine() {
      const [expanded, setExpanded] = useState(false);
      return (
        <>
          <button onClick={() => setExpanded(true)}>Add series</button>
          <Line
            series={
              expanded
                ? [
                    { name: "north", data: [1, 2, 3] },
                    { name: "south", data: [2, 1] },
                  ]
                : [{ name: "north", data: [1, 2] }]
            }
          />
        </>
      );
    }

    const { container, getByRole } = render(
      <Root highlight={{ series: "north" }}>
        <LiveLine />
      </Root>,
    );
    fireEvent.click(getByRole("button", { name: "Add series" }));

    const newPoint = container.querySelector(
      'circle[data-part="mark"][data-series="north"][data-i="2"]',
    );
    const newSeries = container.querySelector(
      'path[data-part="mark"][data-series="south"]',
    );
    expect(newPoint).not.toBeNull();
    expect(newSeries).not.toBeNull();
    await waitFor(() => {
      expect(newPoint!.hasAttribute("data-dg-active")).toBe(true);
      expect(newSeries!.hasAttribute("data-dg-muted")).toBe(true);
    });
  });

  it("stamps new matching and nonmatching marks when the highlight stays the same", async () => {
    const { container, rerender } = render(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "north", data: [1, 2] },
            { name: "south", data: [2, 1] },
          ]}
        />
      </Root>,
    );

    rerender(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "north", data: [1, 2, 3] },
            { name: "south", data: [2, 1] },
            { name: "east", data: [3, 2] },
          ]}
        />
      </Root>,
    );

    const newPoint = container.querySelector(
      'circle[data-part="mark"][data-series="north"][data-i="2"]',
    );
    const newSeries = container.querySelector(
      'path[data-part="mark"][data-series="east"]',
    );
    expect(newPoint).not.toBeNull();
    expect(newSeries).not.toBeNull();
    await waitFor(() => {
      expect(newPoint!.hasAttribute("data-dg-active")).toBe(true);
      expect(newPoint!.hasAttribute("data-dg-muted")).toBe(false);
      expect(newSeries!.hasAttribute("data-dg-muted")).toBe(true);
      expect(newSeries!.hasAttribute("data-dg-active")).toBe(false);
    });
  });

  it("replaces stale stamps when a reused mark changes series", async () => {
    const { container, rerender } = render(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "north", data: [1, 2] },
            { name: "south", data: [2, 1] },
          ]}
        />
      </Root>,
    );
    const paths = container.querySelectorAll('path[data-part="mark"]');
    expect(paths[0]!.hasAttribute("data-dg-active")).toBe(true);
    expect(paths[1]!.hasAttribute("data-dg-muted")).toBe(true);

    rerender(
      <Root highlight={{ series: "north" }}>
        <Line
          series={[
            { name: "south", data: [1, 2] },
            { name: "north", data: [2, 1] },
          ]}
        />
      </Root>,
    );

    expect(paths[0]!.getAttribute("data-series")).toBe("south");
    expect(paths[1]!.getAttribute("data-series")).toBe("north");
    await waitFor(() => {
      expect(paths[0]!.hasAttribute("data-dg-active")).toBe(false);
      expect(paths[0]!.hasAttribute("data-dg-muted")).toBe(true);
      expect(paths[1]!.hasAttribute("data-dg-muted")).toBe(false);
      expect(paths[1]!.hasAttribute("data-dg-active")).toBe(true);
    });
  });

  it("restamps a mark when its identifying attribute changes", async () => {
    const { container } = render(
      <Root highlight={{ series: "north" }}>
        <Line series={[{ name: "north", data: [1, 2] }]} />
      </Root>,
    );
    const path = container.querySelector('path[data-part="mark"]')!;
    expect(path.hasAttribute("data-dg-active")).toBe(true);

    path.setAttribute("data-series", "south");

    await waitFor(() => {
      expect(path.hasAttribute("data-dg-active")).toBe(false);
      expect(path.hasAttribute("data-dg-muted")).toBe(true);
    });
  });

  it("does not rescan marks when tooltip pointer moves change its content", async () => {
    const { container } = render(
      <Root highlight={{ series: "north" }}>
        <Line series={[{ name: "north", data: [1, 2] }]} />
        <Tooltip>{({ datum }) => <span>{datum.index}</span>}</Tooltip>
      </Root>,
    );
    const root = container.firstElementChild as HTMLDivElement;
    const marks = root.querySelectorAll('circle[data-part="mark"][data-i]');
    const scan = vi.spyOn(root, "querySelectorAll");

    try {
      fireEvent.pointerMove(marks[0]!, { clientX: 5, clientY: 5 });
      fireEvent.pointerMove(marks[1]!, { clientX: 10, clientY: 10 });
      expect(root.querySelector('[role="tooltip"]')?.textContent).toBe("1");
      await Promise.resolve();
      expect(scan).not.toHaveBeenCalled();
    } finally {
      scan.mockRestore();
    }
  });
});
