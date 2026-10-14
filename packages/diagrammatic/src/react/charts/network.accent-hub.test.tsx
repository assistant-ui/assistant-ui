import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Graph } from "../../core/types";
import { round } from "../../core/geometry";
import { ACCENT } from "../../core/theme";
import { frame } from "../svg";
import { Network } from "./network";

const width = 480;
const height = 300;
const F = frame({ width, height }, 5 / 3);
const center = {
  cx: round((F.left + F.right) / 2),
  cy: round((F.top + F.bottom) / 2),
};

function renderedMarks(graph: Graph) {
  const html = renderToStaticMarkup(
    <Network graph={graph} width={width} height={height} />,
  );
  return [
    ...html.matchAll(
      /<g data-part="mark" data-series="([^"]+)">([\s\S]*?)<\/g>/g,
    ),
  ].map(([, id, body]) => {
    const circles = [...(body ?? "").matchAll(/<circle\b[^>]*>/g)];
    const mark = circles[1]?.[0] ?? "";
    return {
      id,
      cx: Number(/\bcx="([^"]+)"/.exec(mark)?.[1]),
      cy: Number(/\bcy="([^"]+)"/.exec(mark)?.[1]),
      fill: /\bfill="([^"]+)"/.exec(mark)?.[1],
    };
  });
}

describe("Network accent hub", () => {
  it("accents the centered first node when degrees tie", () => {
    const graph: Graph = {
      nodes: [{ id: "first" }, { id: "second" }],
      links: [{ source: "second", target: "first" }],
    };
    const marks = renderedMarks(graph);

    expect(marks).toHaveLength(graph.nodes.length);
    expect(marks.find((mark) => mark.id === "first")).toMatchObject(center);
    expect(marks.filter((mark) => mark.fill === ACCENT)).toEqual([
      { id: "first", ...center, fill: ACCENT },
    ]);
  });

  it("accents the centered first node without links", () => {
    const graph: Graph = {
      nodes: [{ id: "first" }, { id: "second" }],
      links: [],
    };
    const marks = renderedMarks(graph);

    expect(marks).toHaveLength(graph.nodes.length);
    expect(marks.find((mark) => mark.id === "first")).toMatchObject(center);
    expect(marks.filter((mark) => mark.fill === ACCENT)).toEqual([
      { id: "first", ...center, fill: ACCENT },
    ]);
  });
});
