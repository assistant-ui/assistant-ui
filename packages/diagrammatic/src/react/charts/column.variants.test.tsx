import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACCENT, ink } from "../../core/theme";
import { Column } from "./column";

const tags = (markup: string, name: string) =>
  Array.from(
    markup.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g")),
    ([tag]) => tag,
  );
const attr = (tag: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(tag)?.[1];
const finite = (markup: string) =>
  expect(markup).not.toMatch(/NaN|Infinity|undefined/);

describe("Column variants", () => {
  it("fits a trend over item indices at the first and last column centers", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[
          { label: "a", value: 1 },
          { label: "b", value: 4 },
          { label: "c", value: 2 },
        ]}
        trend
      />,
    );
    const trends = tags(html, "line").filter(
      (tag) => attr(tag, "data-part") === "trend",
    );
    expect(trends).toHaveLength(1);
    const line = trends[0]!;
    const hits = tags(html, "rect").filter(
      (tag) => attr(tag, "fill") === "transparent",
    );
    const center = (tag: string) =>
      Number(attr(tag, "x")) + Number(attr(tag, "width")) / 2;
    expect(Number(attr(line, "x1"))).toBeCloseTo(center(hits[0]!), 0);
    expect(Number(attr(line, "x2"))).toBeCloseTo(center(hits[2]!), 0);
    const top = Number(attr(hits[0]!, "y"));
    const bottom = top + Number(attr(hits[0]!, "height"));
    expect(Number(attr(line, "y1"))).toBeCloseTo(
      bottom - (11 / 6 / 4) * (bottom - top),
      1,
    );
    expect(Number(attr(line, "y2"))).toBeCloseTo(
      bottom - (17 / 6 / 4) * (bottom - top),
      1,
    );
    expect(attr(line, "stroke")).toBe(ACCENT);
    expect(attr(line, "stroke-dasharray")).toBe("3 4");
    expect(attr(line, "opacity")).toBe("0.7");
    expect(attr(line, "stroke-width")).toBe("1");
    finite(html);
  });

  it("skips the trend on logarithmic scales and short data", () => {
    for (const props of [
      {
        items: [
          { label: "a", value: 1 },
          { label: "b", value: 4 },
        ],
        yScale: "log" as const,
      },
      { items: [{ label: "a", value: 1 }] },
      { items: [] },
    ]) {
      const html = renderToStaticMarkup(<Column {...props} trend />);
      expect(html).not.toContain('data-part="trend"');
      finite(html);
    }
  });

  it("draws filled dot stacks over faint tracks and sends negative dots below zero", () => {
    const items = [
      { label: "peak", value: 10 },
      { label: "gain", value: 4 },
      { label: "trough", value: -5 },
      { label: "loss", value: -2 },
    ];
    const html = renderToStaticMarkup(<Column mark="dot" items={items} />);
    const bars = renderToStaticMarkup(<Column items={items} />);
    const baseline = tags(html, "line").find(
      (tag) => attr(tag, "data-part") === "grid",
    )!;
    const zeroY = Number(attr(baseline, "y1"));
    const groupsOf = (markup: string) =>
      [
        ...markup.matchAll(
          /<g[^>]*data-part="mark"[^>]*data-i="\d+"[^>]*>[\s\S]*?<\/g>/g,
        ),
      ].map(([tag]) => tag);
    const groups = groupsOf(html);
    const barGroups = groupsOf(bars);
    const EXPECTED_DOTS = [16, 6, 7, 3];
    expect(groups).toHaveLength(4);
    for (const [i, markup] of groups.entries()) {
      expect(tags(markup, "rect")).toHaveLength(0);
      const circles = tags(markup, "circle");
      const tracks = circles.filter((tag) => attr(tag, "fill") === ink(0.08));
      const filled = circles.filter((tag) => attr(tag, "fill") !== ink(0.08));
      const bar = tags(barGroups[i]!, "rect")[0]!;
      expect(filled.length).toBe(EXPECTED_DOTS[i]);
      expect(
        filled.every(
          (tag) =>
            attr(tag, "fill") === attr(bar, "fill") &&
            attr(tag, "opacity") === attr(bar, "opacity"),
        ),
      ).toBe(true);
      expect(
        circles.every((tag) =>
          items[i]!.value > 0
            ? Number(attr(tag, "cy")) < zeroY
            : Number(attr(tag, "cy")) > zeroY,
        ),
      ).toBe(true);
      if (i === 1 || i === 3) expect(tracks.length).toBeGreaterThan(0);
    }
    finite(html);
    finite(bars);
  });

  it("prints a dot column's value past its last filled dot", () => {
    const html = renderToStaticMarkup(
      <Column
        mark="dot"
        items={[{ label: "a", value: 5 }]}
        yTicks={[{ at: 10, label: "10" }]}
      />,
    );
    const circles = tags(html, "circle").filter(
      (tag) => attr(tag, "fill") !== ink(0.08),
    );
    const topDot = Math.min(...circles.map((tag) => Number(attr(tag, "cy"))));
    const label = tags(html, "text").find(
      (tag) => attr(tag, "text-anchor") === "middle",
    )!;
    expect(Number(attr(label, "y"))).toBeLessThan(topDot);
  });

  it("keeps the default bar output identical to an explicit bar mark", () => {
    const items = [
      { label: "a", value: 2 },
      { label: "b", value: 5 },
    ];
    const implicit = renderToStaticMarkup(<Column items={items} />);
    const explicit = renderToStaticMarkup(<Column items={items} mark="bar" />);
    expect(implicit).toBe(explicit);
    finite(implicit);
  });

  it("keeps a trend that overshoots the columns inside the value axis", () => {
    const items = [
      { label: "a", value: 0 },
      { label: "b", value: 100 },
      { label: "c", value: 100 },
    ];
    const barTop = (markup: string) =>
      Math.min(
        ...tags(markup, "rect")
          .filter((tag) => attr(tag, "data-part") !== "mark")
          .map((tag) => Number(attr(tag, "y"))),
      );
    const plain = renderToStaticMarkup(<Column items={items} />);
    const html = renderToStaticMarkup(<Column items={items} trend />);
    const trend = tags(html, "line").find(
      (tag) => attr(tag, "data-part") === "trend",
    )!;
    expect(Math.min(Number(attr(trend, "y1")), Number(attr(trend, "y2")))).toBe(
      barTop(plain),
    );
  });

  it("falls back to bars when columns are too thin for dots", () => {
    const items = Array.from({ length: 400 }, (_, i) => ({
      label: String(i),
      value: (i % 7) + 1,
    }));
    const html = renderToStaticMarkup(<Column mark="dot" items={items} />);
    expect(tags(html, "circle")).toHaveLength(0);
    expect(html).toBe(renderToStaticMarkup(<Column items={items} />));
  });

  it("draws no dots for a nonpositive value on log paper", () => {
    const html = renderToStaticMarkup(
      <Column
        mark="dot"
        yScale="log"
        items={[
          { label: "a", value: 10 },
          { label: "b", value: -1 },
        ]}
      />,
    );
    const group = [
      ...html.matchAll(
        /<g[^>]*data-part="mark"[^>]*data-i="1"[^>]*>[\s\S]*?<\/g>/g,
      ),
    ][0]![0];
    expect(tags(group, "circle")).toHaveLength(0);
    finite(html);
  });
});
