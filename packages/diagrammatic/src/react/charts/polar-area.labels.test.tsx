import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textWidth } from "../../core/text";
import { PAD, frame } from "../svg";
import { PolarArea } from "./polar-area";

function label(html: string, text: string) {
  const match = [...html.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].find(
    ([, , content]) => content === text,
  );
  if (!match) throw new Error(`Missing PolarArea label: ${text}`);
  const attrs = match[1]!;
  return {
    x: Number(/\bx="([^"]+)"/.exec(attrs)?.[1]),
    y: Number(/\by="([^"]+)"/.exec(attrs)?.[1]),
    textAnchor: /\btext-anchor="([^"]+)"/.exec(attrs)?.[1],
  };
}

function outerRadius(html: string) {
  const mark = [...html.matchAll(/<path\b[^>]*>/g)].find(([tag]) =>
    tag!.includes('data-part="mark"'),
  )?.[0];
  const path = /\bd="([^"]+)"/.exec(mark ?? "")?.[1] ?? "";
  return Number(/\bA([\d.]+) [\d.]+/.exec(path)?.[1]);
}

function distanceFromInterval(value: number, start: number, end: number) {
  return value < start ? start - value : value > end ? value - end : 0;
}

describe("PolarArea labels", () => {
  it("anchors the largest diagonal labels outside their sectors", () => {
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      label: String(i).padStart(2, "0"),
      value: i === 16 ? 61 : 10,
    }));
    const monthly = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ].map((name) => ({ label: name, value: name === "Nov" ? 41 : 18 }));

    const hourlyLabels = renderToStaticMarkup(<PolarArea items={hourly} />);
    const monthlyLabels = renderToStaticMarkup(<PolarArea items={monthly} />);

    expect(label(hourlyLabels, "16").textAnchor).toBe("end");
    expect(label(monthlyLabels, "Nov").textAnchor).toBe("end");
    expect(label(monthlyLabels, "Apr").textAnchor).toBe("start");
  });

  it("centers labels near the top and bottom when their text fits", () => {
    const items = Array.from({ length: 24 }, (_, i) => ({
      label: String.fromCharCode(97 + i),
      value: 1,
    }));
    const html = renderToStaticMarkup(<PolarArea items={items} />);

    expect(label(html, "a").textAnchor).toBe("middle");
    expect(label(html, "m").textAnchor).toBe("middle");
  });

  it("keeps a full-width side label inside the frame", () => {
    const html = renderToStaticMarkup(
      <PolarArea
        height={640}
        items={[
          { label: "Northwest", value: 1 },
          { label: "West", value: 1 },
        ]}
      />,
    );
    const sideLabel = label(html, "Northwest");
    const width = Number(/<svg\b[^>]*\bwidth="([^"]+)"/.exec(html)?.[1]);

    expect(sideLabel.textAnchor).toBe("start");
    expect(sideLabel.x + textWidth("Northwest", 11)).toBeLessThanOrEqual(
      width - PAD,
    );
  });

  it("keeps diagonal text outside the sector at large font sizes", () => {
    const fontSize = 48;
    const html = renderToStaticMarkup(
      <PolarArea
        height={640}
        fontSize={fontSize}
        items={[
          { label: "NW", value: 1 },
          { label: "NE", value: 1 },
          { label: "SW", value: 1 },
          { label: "SE", value: 1 },
        ]}
      />,
    );
    const mark = [...html.matchAll(/<path\b[^>]*>/g)].find(([tag]) =>
      tag!.includes('data-part="mark"'),
    )?.[0];
    const path = /\bd="([^"]+)"/.exec(mark ?? "")?.[1] ?? "";
    const start = /\bM([\d.]+) ([\d.]+)/.exec(path);
    const outer = Number(/\bA([\d.]+) [\d.]+/.exec(path)?.[1]);
    const cx = Number(start?.[1]);
    const cy = Number(start?.[2]) + outer;

    for (const text of ["NW", "NE", "SW", "SE"]) {
      const rendered = label(html, text);
      const textWidthPx = textWidth(text, fontSize);
      const left =
        rendered.textAnchor === "start"
          ? rendered.x
          : rendered.textAnchor === "end"
            ? rendered.x - textWidthPx
            : rendered.x - textWidthPx / 2;
      const nearestX = distanceFromInterval(cx, left, left + textWidthPx);
      const nearestY = distanceFromInterval(
        cy,
        rendered.y - fontSize / 2,
        rendered.y + fontSize / 2,
      );

      expect(Math.hypot(nearestX, nearestY)).toBeGreaterThanOrEqual(outer);
    }
  });

  it("sizes a wide frame from the text height, then keeps the labels in it", () => {
    const width = 960;
    const height = 384;
    const labels = [
      "Sub-Saharan Africa pipeline",
      "North America rollout",
      "Western Europe",
      "Asia Pacific",
    ];
    const html = renderToStaticMarkup(
      <PolarArea
        width={width}
        height={height}
        items={labels.map((text) => ({ label: text, value: 1 }))}
      />,
    );
    const F = frame({ width, height }, 5 / 3);
    const axis = F.T.axis.px;
    const labelGap = Math.max(6, axis / 2 + 1);
    const verticalClearance = (F.bottom - F.top) / 2 - axis / 2 - labelGap;
    const horizontalClearance =
      (F.right - F.left) / 2 -
      textWidth("Sub-Saharan Africa pipeline", axis) -
      labelGap;

    // The vertical axis only has to hold the text height, so a wide frame keeps
    // its radius even when the labels are wider than the frame is tall.
    expect(horizontalClearance).toBeGreaterThan(verticalClearance);
    expect(outerRadius(html)).toBeCloseTo(verticalClearance, 1);

    for (const text of labels) {
      const rendered = label(html, text);
      const textWidthPx = textWidth(text, axis);
      const left =
        rendered.textAnchor === "start"
          ? rendered.x
          : rendered.textAnchor === "end"
            ? rendered.x - textWidthPx
            : rendered.x - textWidthPx / 2;

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + textWidthPx).toBeLessThanOrEqual(width);
      expect(rendered.y - axis / 2).toBeGreaterThanOrEqual(0);
      expect(rendered.y + axis / 2).toBeLessThanOrEqual(height);
    }
  });
});
