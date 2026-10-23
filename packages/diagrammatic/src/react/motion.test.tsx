import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArcDiagram, Line, Sankey, Sparkline } from "../index";
import { DotWorldMap } from "../world";
import { FIXTURES } from "./testUtils";

const trails = (html: string) =>
  [...html.matchAll(/<path[^>]*data-dg-flow=""[^>]*>/g)].map((m) => m[0]);

describe("motion layers", () => {
  for (const name of [
    "sankey",
    "chord",
    "network",
    "arc-diagram",
    "flow-map",
  ] as const) {
    it(`${name} stamps one inert trail per directed connection`, () => {
      const html = renderToStaticMarkup(FIXTURES[name]!);
      const found = trails(html);
      expect(found.length).toBeGreaterThan(0);
      for (const trail of found) {
        expect(trail).toContain('pathLength="1"');
        expect(trail).toContain('stroke-opacity="0"');
        expect(trail).toContain('pointer-events="none"');
        expect(trail).not.toContain('data-part="mark"');
      }
    });
  }

  it("hands a Sankey sweep from one column stage to the next", () => {
    const html = renderToStaticMarkup(
      <Sankey
        graph={{
          nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
          links: [
            { source: "a", target: "b", value: 2 },
            { source: "b", target: "c", value: 2 },
          ],
        }}
      />,
    );
    const starts = trails(html).map((t) =>
      Number(t.match(/--dg-flow-from:(-?[\d.]+)/)![1]),
    );
    const ends = trails(html).map((t) =>
      Number(t.match(/--dg-flow-to:(-?[\d.]+)/)![1]),
    );
    expect(starts).toEqual([0.3, 1.3]);
    expect(ends).toEqual([-1.7, -0.7]);
  });

  it("runs an arc trail from its source even when the source sits to the right", () => {
    const html = renderToStaticMarkup(
      <ArcDiagram
        graph={{
          nodes: [{ id: "a" }, { id: "b" }],
          links: [{ source: "b", target: "a", value: 1 }],
        }}
      />,
    );
    const d = trails(html)[0]!.match(/ d="M([\d.]+)/)![1]!;
    const nodes = [
      ...html.matchAll(/data-series="([ab])"[^>]*>\s*<circle cx="([\d.]+)"/g),
    ];
    const bx = nodes.find((m) => m[1] === "b")![2]!;
    expect(Number(d)).toBe(Number(bx));
  });

  it("numbers every flow sample on a world map from source to target", () => {
    const html = renderToStaticMarkup(
      <DotWorldMap
        groups={{ a: ["US"], b: ["GB"] }}
        flows={[{ from: "US", to: "GB" }]}
      />,
    );
    const ts = [...html.matchAll(/--dg-t:([\d.]+)/g)].map((m) => Number(m[1]));
    expect(ts[0]).toBe(0);
    expect(ts[ts.length - 1]).toBe(1);
    expect(ts).toEqual([...ts].sort((x, y) => x - y));
  });

  it("puts an inert pulse on the latest point of a single series", () => {
    for (const element of [
      <Line key="line" data={[1, 3, 2]} />,
      <Sparkline key="sparkline" data={[1, 3, 2]} />,
    ]) {
      const html = renderToStaticMarkup(element);
      expect(html).toMatch(/<circle[^>]*opacity="0"[^>]*data-dg-pulse=""/);
    }
    expect(
      renderToStaticMarkup(
        <Line
          series={[
            { name: "a", data: [1, 2] },
            { name: "b", data: [2, 1] },
          ]}
        />,
      ),
    ).not.toContain("data-dg-pulse");
  });
});
