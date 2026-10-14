// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Area } from "../react/charts/area";
import { Zoom, type Transform } from "./zoom";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const DATA = [12, 18, 15];

function renderDrag(handlers: {
  onPointerMove?: React.ComponentProps<typeof Zoom>["onPointerMove"];
  onPointerUp?: React.ComponentProps<typeof Zoom>["onPointerUp"];
  onPointerCancel?: React.ComponentProps<typeof Zoom>["onPointerCancel"];
  onLostPointerCapture?: React.ComponentProps<
    typeof Zoom
  >["onLostPointerCapture"];
}) {
  const onChange = vi.fn<(transform: Transform) => void>();
  const { container } = render(
    <Zoom
      defaultTransform={{ k: 2, x: 0, y: 0 }}
      onChange={onChange}
      {...handlers}
    >
      <Area data={DATA} />
    </Zoom>,
  );
  const host = container.querySelector<HTMLDivElement>("[data-dg-zoom]")!;
  host.setPointerCapture = vi.fn();
  host.hasPointerCapture = vi.fn(() => true);
  host.releasePointerCapture = vi.fn();
  fireEvent.pointerDown(host, {
    pointerId: 7,
    button: 0,
    clientX: 100,
    clientY: 50,
  });
  return { host, onChange };
}

function stubBoxes(svg: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const box =
        this.tagName.toLowerCase() === "svg"
          ? svg
          : { left: 50, top: 50, width: 1000, height: 500 };
      return box as DOMRect;
    },
  );
}

function stubChangingBoxes() {
  const sizes = new Map([
    ["first", { width: 400, height: 200 }],
    ["second", { width: 800, height: 400 }],
  ]);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const size = sizes.get(this.getAttribute("data-figure") ?? "") ?? {
        width: 1000,
        height: 500,
      };
      return { left: 0, top: 0, ...size } as DOMRect;
    },
  );
  const observed = new Set<Element>();
  let notify: ResizeObserverCallback = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        notify = callback;
      }
      observe(element: Element) {
        observed.add(element);
      }
      unobserve(element: Element) {
        observed.delete(element);
      }
      disconnect() {
        observed.clear();
      }
    },
  );
  return {
    sizes,
    observed,
    resize: () => act(() => notify([], {} as ResizeObserver)),
  };
}

describe("Zoom pointer handlers", () => {
  it("calls onPointerMove and pans unless the consumer prevents the move", () => {
    const seen: number[] = [];
    const { host, onChange } = renderDrag({
      onPointerMove: (event) => {
        seen.push(event.clientX);
        if (event.clientX === 110) event.preventDefault();
      },
    });
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 110, clientY: 50 });
    expect(seen).toEqual([110]);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 120, clientY: 50 });
    expect(seen).toEqual([110, 120]);
    expect(onChange).toHaveBeenLastCalledWith({ k: 2, x: 20, y: 0 });
  });

  it("calls onPointerUp and ends the drag unless the consumer prevents it", () => {
    const onPointerUp = vi.fn((event: React.PointerEvent<HTMLDivElement>) => {
      if (event.clientX === 110) event.preventDefault();
    });
    const { host, onChange } = renderDrag({ onPointerUp });
    fireEvent.pointerUp(host, { pointerId: 7, clientX: 110 });
    expect(onPointerUp).toHaveBeenCalledTimes(1);
    expect(host.releasePointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 120, clientY: 50 });
    expect(onChange).toHaveBeenLastCalledWith({ k: 2, x: 20, y: 0 });
    fireEvent.pointerUp(host, { pointerId: 7, clientX: 120 });
    expect(onPointerUp).toHaveBeenCalledTimes(2);
    expect(host.releasePointerCapture).toHaveBeenCalledWith(7);
    onChange.mockClear();
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 130, clientY: 50 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops panning after capture is lost following a prevented pointer up", () => {
    const onLostPointerCapture = vi.fn(
      (event: React.PointerEvent<HTMLDivElement>) => event.preventDefault(),
    );
    const { host, onChange } = renderDrag({
      onPointerUp: (event) => event.preventDefault(),
      onLostPointerCapture,
    });
    fireEvent.pointerUp(host, { pointerId: 7, clientX: 110 });
    fireEvent.lostPointerCapture(host, { pointerId: 7 });
    expect(onLostPointerCapture).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 120, clientY: 50 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onPointerCancel and ends the drag unless the consumer prevents it", () => {
    const onPointerCancel = vi.fn(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.clientX === 110) event.preventDefault();
      },
    );
    const { host, onChange } = renderDrag({ onPointerCancel });
    fireEvent.pointerCancel(host, { pointerId: 7, clientX: 110 });
    expect(onPointerCancel).toHaveBeenCalledTimes(1);
    expect(host.releasePointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 120, clientY: 50 });
    expect(onChange).toHaveBeenLastCalledWith({ k: 2, x: 20, y: 0 });
    fireEvent.pointerCancel(host, { pointerId: 7, clientX: 120 });
    expect(onPointerCancel).toHaveBeenCalledTimes(2);
    expect(host.releasePointerCapture).toHaveBeenCalledWith(7);
    onChange.mockClear();
    fireEvent.pointerMove(host, { pointerId: 7, clientX: 130, clientY: 50 });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Zoom SVG box", () => {
  it("measures the chart after an icon SVG", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const box = this.matches("svg[data-dg]")
          ? { width: 400, height: 200 }
          : this.tagName.toLowerCase() === "svg"
            ? { width: 24, height: 24 }
            : { width: 1000, height: 500 };
        return { left: 0, top: 0, ...box } as DOMRect;
      },
    );
    const seen: { x: number; y: number }[] = [];
    render(
      <Zoom defaultTransform={{ k: 2, x: -200, y: -100 }}>
        {(view) => {
          seen.push(view);
          return (
            <>
              <svg aria-label="Icon" />
              <Area data={DATA} view={view} />
            </>
          );
        }}
      </Zoom>,
    );
    expect(seen.at(-1)).toMatchObject({ x: 0.25, y: 0.25 });
  });

  it("rebinds measurement when the SVG is replaced in the same Zoom instance", async () => {
    const { sizes, observed, resize } = stubChangingBoxes();
    const seen: { x: number; y: number }[] = [];
    const chart = (kind: "first" | "second") => (
      <Zoom defaultTransform={{ k: 2, x: -200, y: -100 }}>
        {(view) => {
          seen.push(view);
          return <svg key={kind} data-dg="" data-figure={kind} />;
        }}
      </Zoom>
    );
    const { container, rerender } = render(chart("first"));
    const host = container.querySelector("[data-dg-zoom]")!;
    const first = container.querySelector("svg")!;
    expect(seen.at(-1)).toMatchObject({ x: 0.25, y: 0.25 });

    rerender(chart("second"));
    const second = container.querySelector("svg")!;
    await waitFor(
      () => expect(seen.at(-1)).toMatchObject({ x: 0.125, y: 0.125 }),
      { timeout: 250 },
    );
    expect(observed.has(host)).toBe(true);
    expect(observed.has(first)).toBe(false);
    expect(observed.has(second)).toBe(true);

    sizes.set("second", { width: 500, height: 250 });
    resize();
    expect(seen.at(-1)).toMatchObject({ x: 0.2, y: 0.2 });
  });

  it("switches between the wrapper and an SVG that mounts late", async () => {
    stubChangingBoxes();
    const seen: { x: number; y: number }[] = [];
    const chart = (show: boolean) => (
      <Zoom defaultTransform={{ k: 2, x: -200, y: -100 }}>
        {(view) => {
          seen.push(view);
          return show ? (
            <svg data-dg="" data-figure="first" />
          ) : (
            <span>Loading</span>
          );
        }}
      </Zoom>
    );
    const { rerender } = render(chart(false));
    expect(seen.at(-1)).toMatchObject({ x: 0.1, y: 0.1 });

    rerender(chart(true));
    await waitFor(
      () => expect(seen.at(-1)).toMatchObject({ x: 0.25, y: 0.25 }),
      { timeout: 250 },
    );

    rerender(chart(false));
    await waitFor(() => expect(seen.at(-1)).toMatchObject({ x: 0.1, y: 0.1 }), {
      timeout: 250,
    });
  });

  it("maps the view through the SVG dimensions and preserves equal-box mapping", () => {
    const svg = { left: 100, top: 100, width: 400, height: 200 };
    stubBoxes(svg);
    const seen: { x: number; y: number }[] = [];
    const chart = () => (
      <Zoom defaultTransform={{ k: 2, x: -200, y: -100 }}>
        {(view) => {
          seen.push(view);
          return <Area data={DATA} view={view} />;
        }}
      </Zoom>
    );
    const first = render(chart());
    expect(seen.at(-1)).toMatchObject({ x: 0.25, y: 0.25 });
    first.unmount();
    svg.left = 50;
    svg.top = 50;
    svg.width = 1000;
    svg.height = 500;
    render(chart());
    expect(seen.at(-1)).toMatchObject({ x: 0.1, y: 0.1 });
  });

  it("zooms about the pointer in SVG coordinates", () => {
    stubBoxes({ left: 100, top: 100, width: 400, height: 200 });
    const onChange = vi.fn<(transform: Transform) => void>();
    const { container } = render(
      <Zoom onChange={onChange}>
        {(view) => <Area data={DATA} view={view} />}
      </Zoom>,
    );
    const host = container.querySelector("[data-dg-zoom]")!;
    fireEvent.wheel(host, {
      deltaY: -Math.log(2) / 0.002,
      clientX: 300,
      clientY: 200,
    });
    expect(onChange).toHaveBeenLastCalledWith({ k: 2, x: -200, y: -100 });
  });

  it("zooms about the SVG center on the keyboard", () => {
    stubBoxes({ left: 100, top: 100, width: 400, height: 200 });
    const onChange = vi.fn<(transform: Transform) => void>();
    const { container } = render(
      <Zoom onChange={onChange}>
        {(view) => <Area data={DATA} view={view} />}
      </Zoom>,
    );
    fireEvent.keyDown(container.querySelector("[data-dg-zoom]")!, { key: "+" });
    expect(onChange).toHaveBeenLastCalledWith({ k: 1.3, x: -60, y: -30 });
  });
});
