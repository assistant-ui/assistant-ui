// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getMarkDatum, Root } from "../../interactive";
import { Horizon } from "./horizon";

afterEach(cleanup);

it("reports the sample and row over a horizon fill", () => {
  const hovers: ReturnType<typeof getMarkDatum>[] = [];
  const { container } = render(
    <Root onMarkHover={(datum) => hovers.push(datum)}>
      <Horizon
        series={[
          { name: "north", data: [2, 4, 6, 8, 5] },
          { name: "south", data: [5, 3, 4, 2, 6] },
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
      'path[data-series="north"][data-part="mark"], rect[data-i="3"]',
    ),
  ].filter((element) => {
    if (element.getAttribute("pointer-events") === "none") return false;
    if (element.tagName.toLowerCase() === "path") return true;
    const top = Number(element.getAttribute("y"));
    return top <= y && y < top + Number(element.getAttribute("height"));
  });
  const target = candidates.at(-1)!;
  fireEvent.pointerMove(target, { clientX: x, clientY: y });
  expect(hovers.at(-1)?.index).toBe(3);
  expect(hovers.at(-1)?.series).toBe("north");
  expect(getMarkDatum(target)?.index).toBe(3);
});
