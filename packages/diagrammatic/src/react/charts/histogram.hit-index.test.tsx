// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getMarkDatum, Root } from "../../interactive";
import { Histogram } from "./histogram";

afterEach(cleanup);

it.each([
  ["smooth fill", { smooth: true }],
  ["comparison stroke", { compare: [3, 5, 4, 7, 2] }],
])("reports the bin over a histogram %s", (_name, options) => {
  const hovers: ReturnType<typeof getMarkDatum>[] = [];
  const { container } = render(
    <Root onMarkHover={(datum) => hovers.push(datum)}>
      <Histogram bins={[2, 4, 6, 8, 5]} {...options} />
    </Root>,
  );
  const hit = container.querySelector('rect[fill="transparent"][data-i="3"]')!;
  const x =
    Number(hit.getAttribute("x")) + Number(hit.getAttribute("width")) / 2;
  const y =
    "compare" in options
      ? Number(
          [
            ...container
              .querySelector('path[stroke-dasharray="3 2"]')!
              .getAttribute("d")!
              .matchAll(/V([\d.-]+)/g),
          ][3]![1],
        )
      : Number(hit.getAttribute("y")) + Number(hit.getAttribute("height")) - 2;
  const candidates = [
    ...container.querySelectorAll('path[data-part="mark"], rect[data-i="3"]'),
  ].filter((element) => {
    if (element.getAttribute("pointer-events") === "none") return false;
    if (element.tagName.toLowerCase() === "rect") return true;
    return "compare" in options
      ? element.getAttribute("stroke-dasharray") === "3 2"
      : element.getAttribute("fill") !== "none";
  });
  const target = candidates.at(-1)!;
  fireEvent.pointerMove(target, { clientX: x, clientY: y });
  expect(hovers.at(-1)?.index).toBe(3);
  expect(getMarkDatum(target)?.index).toBe(3);
});
