import { BoxPlot } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <BoxPlot
    title="Yield by practice"
    groups={[
      { label: "conv", low: 3.1, q1: 4.2, median: 5, q3: 5.8, high: 6.9 },
      { label: "no-till", low: 3.8, q1: 4.5, median: 5, q3: 5.5, high: 6.2 },
      { label: "organic", low: 2.6, q1: 3.4, median: 4, q3: 4.7, high: 5.6 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Behavioral tendencies, three panels of raw runs",
    setup:
      "The eval-report classic: four models, three behavioral metrics, and every run kept as a jittered dot over its box. `categorical` gives each model its identity color, `points` overlays the raw sample, `yTicks` grids each panel — and the three-panel layout is your own markup, because small multiples are composition, not a component.",
    read: "swift touches everything: highest median on all three panels and a tool-call tail past 600 — thoroughness or thrash, the dots let you argue either way. atlas-1 and nova finish with a third of the calls at similar scores elsewhere in the report, and the long grep tails on every model are the runs that got lost before they got found.",
    chart: (
      <Report
        title="Behavioral tendencies on FrontierBench 1.1"
        chip="per run"
        note="One dot per benchmark run. Boxes: quartiles with median; whiskers: full range."
      >
        <div className="grid grid-cols-3 gap-4">
          <figure>
            <figcaption className="mb-1 text-center text-[11px] tracking-[0.08em] uppercase opacity-55">
              Tool calls
            </figcaption>
            <FigTooltip
              labels={["quill", "swift", "atlas-1", "nova"]}
              entries={{
                quill: "median 238 · p75 367 · max 596",
                swift: "median 298 · p75 410 · max 570",
                "atlas-1": "median 90 · p75 114 · max 242",
                nova: "median 100 · p75 134 · max 239",
              }}
            >
              <BoxPlot
                categorical
                title="Tool calls per run"
                aspect={1.35}
                yTicks={[
                  { at: 0, label: "0" },
                  { at: 200, label: "200" },
                  { at: 400, label: "400" },
                  { at: 600, label: "600" },
                ]}
                groups={[
                  {
                    label: "quill",
                    low: 82,
                    q1: 160,
                    median: 238,
                    q3: 367,
                    high: 596,
                    points: [
                      82, 125, 136, 137, 138, 139, 157, 168, 171, 173, 182, 186,
                      198, 235, 242, 248, 249, 272, 282, 322, 359, 370, 408,
                      410, 414, 460, 506, 596,
                    ],
                  },
                  {
                    label: "swift",
                    low: 148,
                    q1: 213,
                    median: 298,
                    q3: 410,
                    high: 570,
                    points: [
                      148, 153, 176, 189, 191, 197, 210, 221, 230, 251, 271,
                      286, 286, 293, 302, 314, 334, 345, 349, 378, 391, 417,
                      452, 454, 474, 482, 546, 570,
                    ],
                  },
                  {
                    label: "atlas-1",
                    low: 37,
                    q1: 66,
                    median: 90,
                    q3: 114,
                    high: 242,
                    points: [
                      37, 40, 41, 51, 55, 63, 65, 67, 71, 72, 75, 77, 89, 90,
                      91, 92, 93, 95, 100, 103, 106, 117, 120, 141, 145, 153,
                      185, 242,
                    ],
                  },
                  {
                    label: "nova",
                    low: 40,
                    q1: 66,
                    median: 100,
                    q3: 134,
                    high: 239,
                    points: [
                      40, 46, 49, 51, 59, 61, 66, 68, 74, 81, 83, 86, 87, 89,
                      110, 110, 116, 116, 119, 120, 126, 137, 143, 145, 147,
                      183, 197, 239,
                    ],
                  },
                ]}
              />
            </FigTooltip>
          </figure>
          <figure>
            <figcaption className="mb-1 text-center text-[11px] tracking-[0.08em] uppercase opacity-55">
              File reads
            </figcaption>
            <FigTooltip
              labels={["quill", "swift", "atlas-1", "nova"]}
              entries={{
                quill: "median 48 · p75 69 · max 128",
                swift: "median 95 · p75 131 · max 244",
                "atlas-1": "median 49 · p75 70 · max 225",
                nova: "median 38 · p75 53 · max 78",
              }}
            >
              <BoxPlot
                categorical
                title="File reads per run"
                aspect={1.35}
                yTicks={[
                  { at: 0, label: "0" },
                  { at: 50, label: "50" },
                  { at: 100, label: "100" },
                  { at: 150, label: "150" },
                ]}
                groups={[
                  {
                    label: "quill",
                    low: 14,
                    q1: 37,
                    median: 48,
                    q3: 69,
                    high: 128,
                    points: [
                      14, 18, 18, 25, 29, 30, 36, 39, 41, 41, 42, 45, 46, 46,
                      49, 58, 63, 64, 64, 68, 68, 69, 72, 75, 89, 91, 98, 128,
                    ],
                  },
                  {
                    label: "swift",
                    low: 44,
                    q1: 67,
                    median: 95,
                    q3: 131,
                    high: 244,
                    points: [
                      44, 48, 49, 55, 56, 60, 65, 73, 77, 79, 80, 89, 92, 94,
                      96, 98, 108, 110, 112, 118, 125, 133, 145, 166, 196, 214,
                      228, 244,
                    ],
                  },
                  {
                    label: "atlas-1",
                    low: 19,
                    q1: 34,
                    median: 49,
                    q3: 70,
                    high: 225,
                    points: [
                      19, 25, 25, 28, 29, 31, 34, 36, 39, 40, 42, 43, 45, 49,
                      49, 51, 53, 59, 61, 61, 67, 71, 71, 81, 98, 104, 122, 225,
                    ],
                  },
                  {
                    label: "nova",
                    low: 10,
                    q1: 31,
                    median: 38,
                    q3: 53,
                    high: 78,
                    points: [
                      10, 11, 12, 13, 22, 23, 30, 33, 33, 34, 35, 35, 37, 38,
                      39, 42, 45, 46, 46, 50, 53, 53, 56, 57, 58, 70, 72, 78,
                    ],
                  },
                ]}
              />
            </FigTooltip>
          </figure>
          <figure>
            <figcaption className="mb-1 text-center text-[11px] tracking-[0.08em] uppercase opacity-55">
              Greps / searches
            </figcaption>
            <FigTooltip
              labels={["quill", "swift", "atlas-1", "nova"]}
              entries={{
                quill: "median 34 · p75 43 · max 77",
                swift: "median 69 · p75 108 · max 240",
                "atlas-1": "median 29 · p75 51 · max 67",
                nova: "median 14 · p75 21 · max 35",
              }}
            >
              <BoxPlot
                categorical
                title="Greps / searches per run"
                aspect={1.35}
                yTicks={[
                  { at: 0, label: "0" },
                  { at: 50, label: "50" },
                  { at: 100, label: "100" },
                  { at: 150, label: "150" },
                ]}
                groups={[
                  {
                    label: "quill",
                    low: 10,
                    q1: 22,
                    median: 34,
                    q3: 43,
                    high: 77,
                    points: [
                      10, 13, 20, 21, 21, 21, 22, 23, 24, 28, 28, 31, 31, 33,
                      34, 35, 36, 37, 39, 40, 42, 43, 50, 56, 59, 66, 68, 77,
                    ],
                  },
                  {
                    label: "swift",
                    low: 30,
                    q1: 50,
                    median: 69,
                    q3: 108,
                    high: 240,
                    points: [
                      30, 37, 40, 40, 49, 49, 50, 51, 52, 56, 57, 60, 60, 64,
                      74, 74, 80, 83, 93, 99, 103, 109, 110, 117, 119, 129, 168,
                      240,
                    ],
                  },
                  {
                    label: "atlas-1",
                    low: 7,
                    q1: 20,
                    median: 29,
                    q3: 51,
                    high: 67,
                    points: [
                      7, 8, 10, 10, 11, 13, 20, 22, 25, 26, 27, 28, 29, 29, 29,
                      30, 30, 31, 41, 44, 51, 51, 52, 52, 59, 61, 64, 67,
                    ],
                  },
                  {
                    label: "nova",
                    low: 6,
                    q1: 9,
                    median: 14,
                    q3: 21,
                    high: 35,
                    points: [
                      6, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 11, 13, 14, 15, 16,
                      17, 17, 17, 18, 20, 21, 22, 26, 28, 32, 34, 35,
                    ],
                  },
                ]}
              />
            </FigTooltip>
          </figure>
        </div>
      </Report>
    ),
  },
];
