import { Scatter } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const MODELS = [
  { x: 0.42, y: 24.5, size: 128, label: "glacier" },
  { x: 0.61, y: 27.9, size: 32, label: "pico" },
  { x: 1.1, y: 31.6, size: 128, label: "quill" },
  { x: 3.2, y: 40.2, size: 200, label: "atlas-0" },
  { x: 1.9, y: 45.8, size: 128, label: "swift" },
  { x: 4.1, y: 46.3, size: 200, label: "nova" },
  { x: 9.6, y: 49.1, size: 1000, label: "atlas-1" },
  { x: 12.4, y: 51.2, size: 1000, label: "atlas-1.1" },
  { x: 0.28, y: 18.4, size: 8, label: "tiny" },
  { x: 6.8, y: 44.1, size: 256, label: "nova-fast" },
  { x: 2.4, y: 38.6, size: 64, label: "kite" },
  { x: 8.2, y: 47.0, size: 400, label: "ridge" },
];

const VOLCANO = [
  { x: -2.4, y: 8.1 },
  { x: -1.8, y: 4.2 },
  { x: -1.1, y: 2.1 },
  { x: -0.6, y: 1.0 },
  { x: -0.3, y: 0.6 },
  { x: 0.1, y: 0.4 },
  { x: 0.4, y: 0.8 },
  { x: 0.8, y: 1.6 },
  { x: 1.2, y: 3.4 },
  { x: 1.7, y: 6.8 },
  { x: 2.2, y: 9.4 },
  { x: 2.6, y: 11.2 },
  { x: -0.9, y: 0.5 },
  { x: 0.2, y: 1.1 },
  { x: 1.4, y: 2.0 },
  { x: -2.1, y: 1.8 },
  { x: 0.6, y: 0.3 },
  { x: -0.2, y: 2.4 },
  { x: 1.9, y: 4.1 },
  { x: -1.5, y: 3.1 },
];

export const glyph = (
  <Scatter
    title="Score against cost"
    points={MODELS.slice(0, 7).map(({ label: _label, ...pt }) => pt)}
    xLabel="cost"
    yLabel="score"
  />
);

export const examples: DemoExample[] = [
  {
    title: "SWE-bench against cost, sized by context",
    setup:
      "Twelve models. X is dollars per million output tokens. Y is SWE-bench Verified. Area is context window in thousands. The third channel is why this is not a line.",
    read: "swift sits at 45.8 for $1.90 with only 128k context. atlas-1 buys 3.3 more points at five times the price and a 1M window. tiny is honest about being tiny. The empty upper-left is the product that does not exist yet.",
    source: "SWE-bench Verified, public list prices, August 2025.",
    chart: (
      <FigTooltip
        labels={MODELS.map((row) => row.label)}
        series={{
          score: MODELS.map((row) => row.y),
          "$ / M out": MODELS.map((row) => row.x),
          "context k": MODELS.map((row) => row.size),
        }}
      >
        <div>
          <Scatter
            density="figure"
            aspect={1.7}
            title="SWE-bench against cost"
            points={MODELS}
            xScale="log"
            xLabel="$ / M output tokens"
            yLabel="SWE-bench Verified"
            xTicks={[
              { at: 0.3, label: "$0.30" },
              { at: 1, label: "$1" },
              { at: 4, label: "$4" },
              { at: 12, label: "$12" },
            ]}
            yTicks={[
              { at: 20, label: "20" },
              { at: 35, label: "35" },
              { at: 50, label: "50" },
            ]}
          />
          <ul className="mt-3 columns-2 gap-x-8 font-[family-name:var(--font-mono)] text-[11px] leading-5 text-(--da-ink)/55">
            {MODELS.map((row) => (
              <li key={row.label}>
                {row.label} · {row.y} · ${row.x} · {row.size}k
              </li>
            ))}
          </ul>
        </div>
      </FigTooltip>
    ),
  },
  {
    title: "Differential expression, one contrast",
    setup:
      "A volcano. X is log2 fold change. Y is −log10 p. The guides are the cuts the lab actually used, not decoration.",
    read: "Two genes clear both cuts on the right. The left arm is quieter. Everything in the grey middle is real biology that this experiment was not powered to name.",
    source: "RNA-seq, treated vs vehicle. n = 6+6. Wald test.",
    chart: (
      <Scatter
        density="figure"
        aspect={1.55}
        title="Treated vs vehicle"
        points={VOLCANO}
        xLabel="log2 fold change"
        yLabel={"−log10 p"}
        xTicks={[
          { at: -2, label: "−2" },
          { at: 0, label: "0" },
          { at: 2, label: "2" },
        ]}
        yTicks={[
          { at: 1.3, label: "0.05" },
          { at: 5, label: "1e-5" },
          { at: 10, label: "1e-10" },
        ]}
        guides={[
          { at: 1.3, label: "p = 0.05" },
          { at: -1, axis: "x", label: "−2×" },
          { at: 1, axis: "x", label: "2×" },
        ]}
      />
    ),
  },
];
