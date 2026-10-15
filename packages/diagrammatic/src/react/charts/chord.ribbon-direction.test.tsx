import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { chordLayout } from "../../core/layout";
import { Chord } from "./chord";

const groups = ["alpha", "beta", "gamma"];
const flows = [
  { from: "alpha", to: "beta", value: 5 },
  { from: "gamma", to: "gamma", value: 2 },
];

function ribbonPath(from: string, to: string) {
  const html = renderToStaticMarkup(
    <Chord groups={groups} flows={flows} width={600} height={600} />,
  );
  const d = new RegExp(
    `<path d="([^"]+)"[^>]*data-series="${from}" data-series2="${to}"`,
  ).exec(html)?.[1];
  expect(d).toBeDefined();
  const commands = [...d!.matchAll(/([MAQZ])([^MAQZ]*)/g)];
  expect(commands.map((command) => command[1])).toEqual([
    "M",
    "A",
    "Q",
    "A",
    "Q",
    "Z",
  ]);
  return commands.map((command) =>
    [...command[2]!.matchAll(/-?\d+(?:\.\d+)?/g)].map((value) =>
      Number(value[0]),
    ),
  );
}

function point(fraction: number, curve: number[], radius: number) {
  const [cx, cy] = curve;
  return [
    Math.round(
      (cx! + radius * Math.cos(fraction * 2 * Math.PI - Math.PI / 2)) * 100,
    ) / 100,
    Math.round(
      (cy! + radius * Math.sin(fraction * 2 * Math.PI - Math.PI / 2)) * 100,
    ) / 100,
  ];
}

describe("Chord ribbon direction", () => {
  it("connects the source end to the target end and returns from the target start", () => {
    const [sourceStart, sourceArc, firstCurve, targetArc, lastCurve] =
      ribbonPath("alpha", "beta");
    const { ribbons } = chordLayout(groups, flows);
    const ribbon = ribbons[0]!;
    const radius = sourceArc![0]!;
    const at = (fraction: number) => point(fraction, firstCurve!, radius);

    expect(sourceStart).toEqual(at(ribbon.s0));
    expect(sourceArc!.slice(-2)).toEqual(at(ribbon.s1));
    expect(sourceArc![4]).toBe(1);
    expect(firstCurve!.slice(-2)).toEqual(at(ribbon.t1));
    expect(targetArc!.slice(-2)).toEqual(at(ribbon.t0));
    expect(targetArc![4]).toBe(0);
    expect(lastCurve!.slice(0, 2)).toEqual(firstCurve!.slice(0, 2));
    expect(lastCurve!.slice(-2)).toEqual(sourceStart);
  });

  it("keeps both spans of a self-ribbon at the flow's arc size", () => {
    const [sourceStart, sourceArc, firstCurve, targetArc] = ribbonPath(
      "gamma",
      "gamma",
    );
    const { ribbons } = chordLayout(groups, flows);
    const ribbon = ribbons[1]!;
    const radius = sourceArc![0]!;
    const at = (fraction: number) => point(fraction, firstCurve!, radius);

    expect(sourceStart).toEqual(at(ribbon.s0));
    expect(sourceArc!.slice(-2)).toEqual(at(ribbon.s1));
    expect(firstCurve!.slice(-2)).toEqual(at(ribbon.t1));
    expect(targetArc!.slice(-2)).toEqual(at(ribbon.t0));
  });
});
