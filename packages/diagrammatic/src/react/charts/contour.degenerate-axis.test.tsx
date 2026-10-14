import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { frame } from "../svg";
import { Contour } from "./contour";

const { left, right, top, bottom } = frame({ width: 400, height: 240 }, 5 / 3, {
  labels: false,
});

function ellipseMarks(html: string) {
  return [...html.matchAll(/<ellipse\b[^>]*>/g)].map(([mark]) => {
    const value = (name: string) =>
      Number(new RegExp(`\\b${name}="([^"]+)"`).exec(mark)?.[1]);
    return {
      cx: value("cx"),
      cy: value("cy"),
      rx: value("rx"),
      ry: value("ry"),
    };
  });
}

describe("Contour degenerate axes", () => {
  it.each([
    [
      "x",
      [
        { x: 7, y: 0 },
        { x: 7, y: 1 },
        { x: 7, y: 2 },
      ],
    ],
    [
      "y",
      [
        { x: 0, y: 7 },
        { x: 1, y: 7 },
        { x: 2, y: 7 },
      ],
    ],
    [
      "both",
      [
        { x: 7, y: 7 },
        { x: 7, y: 7 },
      ],
    ],
  ] as const)(
    "centers a %s-degenerate cloud with visible radii",
    (_axis, points) => {
      const marks = ellipseMarks(
        renderToStaticMarkup(
          <Contour width={400} height={240} points={[...points]} />,
        ),
      );
      expect(marks).toHaveLength(4);
      for (const mark of marks) {
        if (_axis !== "y") {
          expect(mark.cx).toBeCloseTo((left + right) / 2, 1);
        }
        if (_axis !== "x") {
          expect(mark.cy).toBeCloseTo((top + bottom) / 2, 1);
        }
        expect(mark.cx).toBeGreaterThan(left);
        expect(mark.cx).toBeLessThan(right);
        expect(mark.cy).toBeGreaterThan(top);
        expect(mark.cy).toBeLessThan(bottom);
        expect(mark.rx).toBeGreaterThan(0);
        expect(mark.ry).toBeGreaterThan(0);
        expect(Number.isFinite(mark.rx)).toBe(true);
        expect(Number.isFinite(mark.ry)).toBe(true);
      }
    },
  );
});
