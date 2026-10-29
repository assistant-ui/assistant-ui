import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACCENT, NEG, POS, cat } from "../../core/theme";
import { Line } from "./line";

const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );
const attribute = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const paths = (markup: string) =>
  tags(markup, "path").filter((tag) => attribute(tag, "data-part") === "mark");
const trends = (markup: string) =>
  tags(markup, "line").filter((tag) => attribute(tag, "data-part") === "trend");
const finite = (markup: string) =>
  expect(markup).not.toMatch(/NaN|Infinity|undefined/);

describe("Line variants", () => {
  it("clips one smooth path into a positive and a negative stroke at zero", () => {
    const html = renderToStaticMarkup(<Line data={[10, -10, 6]} signed />);
    const marks = paths(html);
    expect(marks.map((tag) => attribute(tag, "stroke"))).toEqual([POS, NEG]);
    expect(attribute(marks[0]!, "d")).toBe(attribute(marks[1]!, "d"));
    expect(attribute(marks[0]!, "d")).toBe(
      attribute(
        paths(renderToStaticMarkup(<Line data={[10, -10, 6]} />))[0]!,
        "d",
      ),
    );
    const [pos, neg] = tags(html, "rect").filter((tag) =>
      /^0$/.test(attribute(tag, "x") ?? ""),
    );
    const zero = tags(html, "line").find(
      (tag) =>
        attribute(tag, "data-part") === "grid" &&
        attribute(tag, "y1") === attribute(neg!, "y"),
    );
    expect(zero).toBeDefined();
    expect(attribute(pos!, "height")).toBe(attribute(neg!, "y"));
    for (const tag of marks) {
      expect(attribute(tag, "clip-path")).toMatch(/^url\(#.+-(pos|neg)\)$/);
    }
    const end = renderToStaticMarkup(<Line data={[10, -10]} signed />);
    expect(
      tags(end, "circle").some((tag) => attribute(tag, "fill") === NEG),
    ).toBe(true);
    expect(
      tags(end, "text").some((tag) => attribute(tag, "fill") === NEG),
    ).toBe(true);
    finite(html);
    finite(end);
  });

  it("adds no zero line for an all-positive series", () => {
    const html = renderToStaticMarkup(<Line data={[2, 5, 3]} signed />);
    expect(attribute(paths(html)[0]!, "stroke")).toBe(POS);
    expect(
      tags(html, "line").filter(
        (tag) => attribute(tag, "data-part") === "grid",
      ),
    ).toHaveLength(1);
    finite(html);
  });

  it("ignores signed for several series", () => {
    const series = [
      { name: "one", data: [-2, 3] },
      { name: "two", data: [4, -1] },
    ];
    const html = renderToStaticMarkup(<Line series={series} signed />);
    expect(paths(html).map((tag) => attribute(tag, "stroke"))).toEqual([
      cat(0),
      cat(1),
    ]);
    expect(paths(html).map((tag) => attribute(tag, "data-series"))).toEqual([
      "one",
      "two",
    ]);
    finite(html);
  });

  it("dashes one continuous tail per series and clamps the forecast index", () => {
    const series = [
      { name: "one", data: [2, 4, 3, 7] },
      { name: "two", data: [1, 2, 5, 8] },
    ];
    const html = renderToStaticMarkup(
      <Line series={series} forecastFrom={2} />,
    );
    for (const name of ["one", "two"]) {
      const marks = paths(html).filter(
        (tag) => attribute(tag, "data-series") === name,
      );
      expect(marks).toHaveLength(2);
      expect(marks.map((tag) => attribute(tag, "stroke-dasharray"))).toEqual([
        undefined,
        "4 4",
      ]);
      const headEnd = /([\d.]+) ([\d.]+)$/.exec(attribute(marks[0]!, "d")!)!;
      const tailStart = /^M([\d.]+) ([\d.]+)/.exec(attribute(marks[1]!, "d")!)!;
      expect(headEnd.slice(1)).toEqual(tailStart.slice(1));
    }
    const early = renderToStaticMarkup(
      <Line series={series} forecastFrom={-4} />,
    );
    expect(paths(early)).toHaveLength(2);
    expect(
      paths(early).map((tag) => attribute(tag, "stroke-dasharray")),
    ).toEqual(["4 4", "4 4"]);
    const late = renderToStaticMarkup(
      <Line series={series} forecastFrom={9} />,
    );
    expect(paths(late)).toHaveLength(2);
    expect(
      paths(late).every(
        (tag) => attribute(tag, "stroke-dasharray") === undefined,
      ),
    ).toBe(true);
    finite(html);
    finite(early);
    finite(late);
  });

  it("composes signed with step and a forecast tail", () => {
    const props = { data: [4, -4, 3], step: true, forecastFrom: 1 };
    const plain = paths(renderToStaticMarkup(<Line {...props} />));
    const marks = paths(renderToStaticMarkup(<Line {...props} signed />));
    expect(marks.map((tag) => attribute(tag, "stroke"))).toEqual([
      POS,
      POS,
      NEG,
      NEG,
    ]);
    expect(marks.map((tag) => attribute(tag, "d"))).toEqual([
      ...plain.map((tag) => attribute(tag, "d")),
      ...plain.map((tag) => attribute(tag, "d")),
    ]);
    expect(marks.map((tag) => attribute(tag, "stroke-dasharray"))).toEqual([
      undefined,
      "4 4",
      undefined,
      "4 4",
    ]);
  });

  it("ignores signed on a logarithmic value axis", () => {
    const html = renderToStaticMarkup(
      <Line data={[1, 10, 100]} signed yScale="log" />,
    );
    expect(paths(html).map((tag) => attribute(tag, "stroke"))).not.toContain(
      POS,
    );
    finite(html);
  });

  it("fits a trend per series in data coordinates and skips logarithmic scales", () => {
    const series = [
      { name: "one", data: [2, 4, 10] },
      { name: "two", data: [5, 3, 1] },
    ];
    const html = renderToStaticMarkup(
      <Line series={series} xs={[1, 2, 5]} trend />,
    );
    expect(trends(html)).toHaveLength(2);
    expect(trends(html).map((tag) => attribute(tag, "data-series"))).toEqual([
      "one",
      "two",
    ]);
    expect(trends(html).map((tag) => attribute(tag, "stroke"))).toEqual([
      cat(0),
      cat(1),
    ]);
    const firstHits = tags(html, "circle").filter(
      (tag) =>
        attribute(tag, "data-dg-hit-target") === "point" &&
        attribute(tag, "data-series") === "one",
    );
    expect(
      ["x1", "y1", "x2", "y2"].map((name) => attribute(trends(html)[0]!, name)),
    ).toEqual([
      attribute(firstHits[0]!, "cx"),
      attribute(firstHits[0]!, "cy"),
      attribute(firstHits[2]!, "cx"),
      attribute(firstHits[2]!, "cy"),
    ]);
    for (const tag of trends(html)) {
      expect(attribute(tag, "stroke-dasharray")).toBe("3 4");
      expect(attribute(tag, "opacity")).toBe("0.7");
    }
    const single = renderToStaticMarkup(<Line data={[1, 2, 3]} trend />);
    expect(attribute(trends(single)[0]!, "stroke")).toBe(ACCENT);
    for (const scale of ["xScale", "yScale"] as const) {
      const log = renderToStaticMarkup(
        <Line data={[1, 2, 3]} trend {...{ [scale]: "log" }} />,
      );
      expect(trends(log)).toHaveLength(0);
      finite(log);
    }
    finite(html);
    finite(single);
  });
});
