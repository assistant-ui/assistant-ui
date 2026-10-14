// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getMarkDatum, Root } from "../../interactive";
import { Streamgraph } from "./streamgraph";

afterEach(cleanup);

it("reports the sample and series over a streamgraph band", () => {
  const hovers: ReturnType<typeof getMarkDatum>[] = [];
  const { container } = render(
    <Root onMarkHover={(datum) => hovers.push(datum)}>
      <Streamgraph
        series={[
          { name: "alpha", data: [2, 4, 6, 8, 5] },
          { name: "beta", data: [5, 3, 4, 2, 6] },
        ]}
      />
    </Root>,
  );
  const firstHit = container.querySelector('rect[data-i="3"]')!;
  const x =
    Number(firstHit.getAttribute("x")) +
    Number(firstHit.getAttribute("width")) / 2;
  const y = Number(firstHit.getAttribute("y")) + 2;
  const candidates = [
    ...container.querySelectorAll(
      'path[data-series="beta"][data-part="mark"], rect[data-i="3"]',
    ),
  ].filter(
    (element) =>
      element.getAttribute("pointer-events") !== "none" &&
      (element.tagName.toLowerCase() === "path" ||
        !element.getAttribute("data-series") ||
        element.getAttribute("data-series") === "beta"),
  );
  const target = candidates.at(-1)!;
  fireEvent.pointerMove(target, { clientX: x, clientY: y });
  expect(hovers.at(-1)?.index).toBe(3);
  expect(hovers.at(-1)?.series).toBe("beta");
  expect(getMarkDatum(target)?.index).toBe(3);
  const clip = target.closest("g[clip-path]")?.getAttribute("clip-path");
  const id = clip?.match(/^url\(#(.+)\)$/)?.[1];
  expect(id).toBeTruthy();
  expect(
    container.querySelector(`clipPath[id="${id}"] path`)?.getAttribute("d"),
  ).toBe(
    container.querySelector('path[data-series="beta"]')?.getAttribute("d"),
  );
});
