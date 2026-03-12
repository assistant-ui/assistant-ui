"use client";

import { useMemo, useState } from "react";
import * as HeatGraph from "heat-graph";
import { SyntaxHighlighter } from "@/components/assistant-ui/shiki-highlighter";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const generateContributions = (): HeatGraph.DataPoint[] => {
  const end = new Date();
  const data: HeatGraph.DataPoint[] = [];
  const rand = seededRandom(42);

  // Momentum: positive = active streak, negative = inactive streak
  let momentum = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(end);
    date.setDate(date.getDate() - (364 - i));

    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const r = rand();

    // Drift momentum toward 0 slowly, with random jolts
    momentum = momentum * 0.85 + (rand() - 0.5) * 1.5;
    // Occasional vacation: strong negative jolt
    if (rand() < 0.01) momentum = -3;
    // Occasional burst week: strong positive jolt
    if (rand() < 0.015) momentum = 3;

    // Probability of being active today
    const activeProb = isWeekend ? 0.25 : 0.7;
    const adjusted = activeProb + momentum * 0.12;

    if (r > adjusted) continue;

    // Count: weekdays get more, peaks come from high momentum
    const base = isWeekend ? 1 : 3;
    const peak = Math.max(0, momentum) * 3;
    const noise = rand() * 6;
    const count = Math.max(1, Math.round(base + peak + noise));

    data.push({ date, count });
  }
  return data;
};

const generateSteps = (): HeatGraph.DataPoint[] => {
  const end = new Date();
  const data: HeatGraph.DataPoint[] = [];
  const rand = seededRandom(77);

  let momentum = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(end);
    date.setDate(date.getDate() - (364 - i));

    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;

    // Momentum: positive = active week, negative = couch week
    momentum = momentum * 0.9 + (rand() - 0.48) * 1.2;
    if (rand() < 0.008) momentum = -2.5; // sick/lazy spell
    if (rand() < 0.012) momentum = 2.5; // training kick

    // Weekdays varied (~5-12k), weekends usually lazy but occasional big days
    const baseSteps = isWeekend ? 1500 : 7000;
    const momentumBoost = momentum * 1500;
    const noise = isWeekend ? (rand() - 0.5) * 1000 : (rand() - 0.5) * 4000;

    // Some weekends are extremely active (hikes, trips) — really pop
    const spike = isWeekend && rand() < 0.1 ? 10000 + rand() * 5000 : 0;

    const count = Math.max(
      500,
      Math.round(baseSteps + momentumBoost + noise + spike),
    );
    data.push({ date, count });
  }
  return data;
};

const generateGym = (): HeatGraph.DataPoint[] => {
  const end = new Date();
  const data: HeatGraph.DataPoint[] = [];
  const rand = seededRandom(123);

  let momentum = 0;
  let weekSessions = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(end);
    date.setDate(date.getDate() - (364 - i));

    const dow = date.getDay();

    // Reset weekly counter on Sunday
    if (dow === 0) weekSessions = 0;

    // Motivation drift
    momentum = momentum * 0.9 + (rand() - 0.45) * 0.8;
    if (rand() < 0.01) momentum = -2; // injury/vacation
    if (rand() < 0.015) momentum = 1.5; // new year energy

    // Target: 3 sessions per week (weekends preferred)
    const sessionsLeft = 3 - weekSessions;
    const daysLeftInWeek = 7 - dow;
    const urgency = daysLeftInWeek > 0 ? sessionsLeft / daysLeftInWeek : 0;
    const overTarget = weekSessions >= 3 ? -0.35 : 0;
    const dayBase = dow === 0 || dow === 6 ? 0.45 : 0.25;

    const goProb = dayBase + urgency * 0.3 + momentum * 0.1 + overTarget;

    if (rand() < Math.max(0, Math.min(0.85, goProb))) {
      weekSessions++;
      data.push({ date, count: 1 });
    }
  }
  return data;
};

const generateMood = (): HeatGraph.DataPoint[] => {
  const end = new Date();
  const data: HeatGraph.DataPoint[] = [];
  const rand = seededRandom(99);

  // Mood drifts around 2.3 (slightly positive) with mean-reversion
  let mood = 2.3;

  for (let i = 0; i < 365; i++) {
    const date = new Date(end);
    date.setDate(date.getDate() - (364 - i));

    // Pull back toward slightly-positive baseline
    mood = mood + (2.3 - mood) * 0.12 + (rand() - 0.5) * 0.7;
    // Rare bad streak
    if (rand() < 0.006) mood = 1.1;
    // Occasional great streak
    if (rand() < 0.02) mood = 2.9;

    mood = Math.max(1, Math.min(3, mood));

    data.push({ date, count: Math.round(mood) });
  }
  return data;
};

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

type ThemeName =
  | "Contributions"
  | "Steps Walked"
  | "Gym Tracker"
  | "Mood Tracker";
const THEME_NAMES: ThemeName[] = [
  "Contributions",
  "Steps Walked",
  "Gym Tracker",
  "Mood Tracker",
];

const THEME_SWATCHES: Record<ThemeName, readonly string[]> = {
  Contributions: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  "Steps Walked": ["#1e3a5f", "#2563eb", "#60a5fa", "#93c5fd"],
  "Gym Tracker": ["#292017", "#f59e0b"],
  "Mood Tracker": ["#b91c1c", "#3a3a3a", "#16a34a"],
};

// Shape styles for tab swatches
const SWATCH_STYLES: Record<
  ThemeName,
  readonly { className: string; style?: React.CSSProperties }[]
> = {
  Contributions: [
    { className: "inline-block size-2.5 rounded-[1px]" },
    { className: "inline-block size-2.5 rounded-[1px]" },
    { className: "inline-block size-2.5 rounded-[1px]" },
    { className: "inline-block size-2.5 rounded-[1px]" },
  ],
  "Steps Walked": [
    { className: "inline-block size-2.5 rounded-full" },
    { className: "inline-block size-2.5 rounded-full" },
    { className: "inline-block size-2.5 rounded-full" },
    { className: "inline-block size-2.5 rounded-full" },
  ],
  "Gym Tracker": [
    { className: "inline-block size-2.5 rotate-45 scale-[0.78]" },
    { className: "inline-block size-2.5 rotate-45 scale-[0.78]" },
  ],
  "Mood Tracker": [
    {
      className: "inline-block size-2.5",
      style: { clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)" },
    },
    {
      className: "inline-block size-2.5",
      style: {
        clipPath:
          "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      },
    },
    {
      className: "inline-block size-2.5",
      style: { clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Color interpolation for steps
// ---------------------------------------------------------------------------

const STEPS_GRADIENT = [
  [15, 23, 42], // 0: near-invisible
  [25, 45, 100], // low: hint of blue
  [45, 100, 220], // mid: solid blue
  [100, 170, 250], // high: bright blue
  [200, 230, 255], // max: near-white
] as const;

const STEPS_MAX = 15000;

function stepsColor(count: number): string {
  const t = count / STEPS_MAX;
  const clamped = Math.min(1, Math.max(0, t));

  const pos = clamped * (STEPS_GRADIENT.length - 1);
  const i = Math.min(Math.floor(pos), STEPS_GRADIENT.length - 2);
  const frac = pos - i;

  const a = STEPS_GRADIENT[i]!;
  const b = STEPS_GRADIENT[i + 1]!;
  const r = Math.round(a[0] + (b[0] - a[0]) * frac);
  const g = Math.round(a[1] + (b[1] - a[1]) * frac);
  const bl = Math.round(a[2] + (b[2] - a[2]) * frac);

  return `rgb(${r},${g},${bl})`;
}

// ---------------------------------------------------------------------------
// Mood labels & shapes
// ---------------------------------------------------------------------------

const MOOD_LABELS = ["", "Bad", "Neutral", "Great"];

// Per-mood shapes: down triangle (bad), hexagon (neutral), up triangle (great)
const MOOD_SHAPES: Record<number, React.CSSProperties> = {
  0: {}, // no entry
  1: { clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)" }, // down triangle
  2: {
    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
  }, // hexagon
  3: { clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }, // up triangle
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ---------------------------------------------------------------------------
// GraphShell — shared layout for all themes
// ---------------------------------------------------------------------------

type CellInfo = {
  date: Date;
  count: number;
  level: number;
  column: number;
  row: number;
};

function GraphShell({
  data,
  containerClassName,
  labelClassName,
  weekStart,
  colorScale,
  classify,
  dayLabelFull,
  cellClassName,
  cellStyle,
  legend,
  tooltipClassName,
  tooltipContent,
}: {
  data: HeatGraph.DataPoint[];
  containerClassName: string;
  labelClassName: string;
  weekStart?: "sunday" | "monday";
  colorScale: string[];
  classify?: (counts: number[]) => (count: number) => number;
  dayLabelFull?: boolean;
  cellClassName?: string;
  cellStyle?:
    | React.CSSProperties
    | ((cell: CellInfo) => React.CSSProperties | undefined);
  legend: React.ReactNode;
  tooltipClassName: string;
  tooltipContent: (cell: CellInfo) => React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-fit rounded-lg border px-4 pt-4 pb-2",
        containerClassName,
      )}
    >
      <HeatGraph.Root
        data={data}
        weekStart={weekStart}
        classify={classify}
        colorScale={colorScale}
        className="flex flex-col"
      >
        <HeatGraph.MonthLabels>
          {({ labels, totalWeeks }) => (
            <div
              className="relative"
              style={{ height: 13, marginLeft: 31, marginBottom: 8 }}
            >
              {labels.map((label) => (
                <span
                  key={`${label.month}-${label.column}`}
                  className={cn(
                    "absolute text-[12px] leading-[13px]",
                    labelClassName,
                  )}
                  style={{ left: `${(label.column / totalWeeks) * 100}%` }}
                >
                  {HeatGraph.MONTH_SHORT[label.month]}
                </span>
              ))}
            </div>
          )}
        </HeatGraph.MonthLabels>

        <div className="flex" style={{ gap: 3 }}>
          <HeatGraph.DayLabels>
            {({ labels }) => (
              <div
                className="flex shrink-0 flex-col"
                style={{ width: 28, gap: 3 }}
              >
                {labels.map((label) => (
                  <span
                    key={label.row}
                    className={cn(
                      "relative text-[12px] leading-[10px]",
                      labelClassName,
                    )}
                    style={{ height: 10 }}
                  >
                    {label.row % 2 === 1 ? (
                      <span className="absolute" style={{ bottom: -3 }}>
                        {dayLabelFull
                          ? HeatGraph.DAY_SHORT[label.dayOfWeek]
                          : HeatGraph.DAY_SHORT[label.dayOfWeek]?.charAt(0)}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </HeatGraph.DayLabels>

          <HeatGraph.Grid
            style={{
              gap: 3,
              gridTemplateRows: "repeat(7, 10px)",
            }}
          >
            {({ cells }) =>
              cells.map((cell) => (
                <HeatGraph.Cell
                  key={`${cell.column}-${cell.row}`}
                  className={cn("size-[10px]", cellClassName)}
                  style={
                    typeof cellStyle === "function"
                      ? cellStyle(cell)
                      : cellStyle
                  }
                />
              ))
            }
          </HeatGraph.Grid>
        </div>

        <div className="flex items-center justify-end" style={{ marginTop: 8 }}>
          {legend}
        </div>

        <HeatGraph.Tooltip
          className={cn(
            "pointer-events-none whitespace-nowrap rounded-md px-3 py-1.5 text-xs shadow-lg ring-1",
            tooltipClassName,
          )}
        >
          {({ cell }) => tooltipContent(cell)}
        </HeatGraph.Tooltip>
      </HeatGraph.Root>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-theme graph components
// ---------------------------------------------------------------------------

function ContributionsGraph({ data }: { data: HeatGraph.DataPoint[] }) {
  return (
    <GraphShell
      data={data}
      containerClassName="border-[#30363d] bg-[#0d1117]"
      labelClassName="text-[#e6edf3]"
      weekStart="sunday"
      colorScale={["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]}
      dayLabelFull
      cellClassName="rounded-[2px]"
      legend={
        <HeatGraph.Legend>
          {({ items }) => (
            <div
              className="flex items-center text-[#8b949e] text-[12px]"
              style={{ gap: 4 }}
            >
              <span style={{ marginRight: 2 }}>Less</span>
              {items.map((item) => (
                <HeatGraph.LegendLevel
                  key={item.level}
                  style={{ width: 10, height: 10 }}
                  className="rounded-[2px]"
                />
              ))}
              <span style={{ marginLeft: 2 }}>More</span>
            </div>
          )}
        </HeatGraph.Legend>
      }
      tooltipClassName="bg-[#1b1f23] text-[#e6edf3] ring-[#30363d]"
      tooltipContent={(cell) => (
        <>
          {cell.count === 0 ? (
            "No contributions"
          ) : (
            <strong>
              {cell.count} contribution{cell.count !== 1 ? "s" : ""}
            </strong>
          )}{" "}
          on {formatDate(cell.date)}
        </>
      )}
    />
  );
}

function StepsGraph({ data }: { data: HeatGraph.DataPoint[] }) {
  return (
    <GraphShell
      data={data}
      containerClassName="border-blue-900/40 bg-[#0a1628]"
      labelClassName="text-blue-300/70"
      weekStart="monday"
      colorScale={["#1e293b", "#1e3a5f", "#2563eb", "#60a5fa", "#93c5fd"]}
      cellClassName="rounded-full"
      cellStyle={(cell) => ({ backgroundColor: stepsColor(cell.count) })}
      legend={
        <div
          className="flex items-center text-[12px] text-blue-300/70"
          style={{ gap: 6 }}
        >
          <span>0</span>
          <div
            style={{
              width: 80,
              height: 10,
              borderRadius: 5,
              background:
                "linear-gradient(to right, rgb(15,23,42), rgb(45,100,220), rgb(100,170,250), rgb(200,230,255))",
            }}
          />
          <span>15k</span>
        </div>
      }
      tooltipClassName="bg-blue-950 text-blue-50 ring-blue-800/50"
      tooltipContent={(cell) => (
        <>
          <strong>{cell.count.toLocaleString()} steps</strong> on{" "}
          {formatDate(cell.date)}
        </>
      )}
    />
  );
}

function GymGraph({ data }: { data: HeatGraph.DataPoint[] }) {
  return (
    <GraphShell
      data={data}
      containerClassName="border-amber-900/40 bg-[#1a1207]"
      labelClassName="text-amber-400/70"
      weekStart="sunday"
      classify={HeatGraph.autoLevels(2)}
      colorScale={["#292017", "#f59e0b"]}
      cellClassName="rotate-45 scale-[0.72]"
      legend={
        <div
          className="flex items-center text-[12px] text-amber-400/70"
          style={{ gap: 4 }}
        >
          <div
            className="size-2.5 rotate-45 scale-[0.72]"
            style={{ backgroundColor: "#292017" }}
          />
          <span>Rest</span>
          <div
            className="size-2.5 rotate-45 scale-[0.72]"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span>Gym</span>
        </div>
      }
      tooltipClassName="bg-amber-950 text-amber-50 ring-amber-800/50"
      tooltipContent={(cell) => (
        <>
          <strong>{cell.count === 0 ? "Rest day" : "Gym day"}</strong>
          {" — "}
          {formatDate(cell.date)}
        </>
      )}
    />
  );
}

function MoodGraph({ data }: { data: HeatGraph.DataPoint[] }) {
  return (
    <GraphShell
      data={data}
      containerClassName="border-neutral-700/40 bg-[#121212]"
      labelClassName="text-neutral-400/70"
      weekStart="monday"
      classify={() => (count: number) => count}
      colorScale={["#121212", "#b91c1c", "#1e1e1e", "#16a34a"]}
      cellStyle={(cell) => MOOD_SHAPES[cell.count]}
      legend={
        <div
          className="flex items-center text-[12px] text-neutral-400/70"
          style={{ gap: 6 }}
        >
          {[
            { level: 1, label: "Bad", color: "#b91c1c" },
            { level: 2, label: "Neutral", color: "#3a3a3a" },
            { level: 3, label: "Great", color: "#16a34a" },
          ].map(({ level, label, color }) => (
            <div key={label} className="flex items-center" style={{ gap: 3 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: color,
                  ...MOOD_SHAPES[level],
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      }
      tooltipClassName="bg-neutral-900 text-neutral-50 ring-neutral-700/50"
      tooltipContent={(cell) => (
        <>
          {cell.count === 0 ? (
            "No entry"
          ) : (
            <>
              Feeling <strong>{MOOD_LABELS[cell.count]}</strong>
            </>
          )}
          {" — "}
          {formatDate(cell.date)}
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const CODE_CONTRIBUTIONS = `const COLORS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

<HeatGraph.Root data={data} weekStart="sunday" colorScale={COLORS}>
  <HeatGraph.Grid className="gap-[3px]">
    {({ cells }) =>
      cells.map((cell) => (
        <HeatGraph.Cell
          key={\`\${cell.column}-\${cell.row}\`}
          className="aspect-square rounded-[2px]"
        />
      ))
    }
  </HeatGraph.Grid>
</HeatGraph.Root>`;

const CODE_STEPS = `const COLORS = ["#e0e7ff", "#c6d7f9", "#8fb0f3", "#5888e8", "#2563eb"];

<HeatGraph.Root data={data} weekStart="monday" colorScale={COLORS}>
  <HeatGraph.Grid className="gap-[4px]">
    {({ cells }) =>
      cells.map((cell) => (
        <HeatGraph.Cell
          key={\`\${cell.column}-\${cell.row}\`}
          className="aspect-square rounded-full"
        />
      ))
    }
  </HeatGraph.Grid>
</HeatGraph.Root>`;

const CODE_GYM = `const COLORS = ["#292017", "#f59e0b"];

<HeatGraph.Root
  data={data}
  classify={HeatGraph.autoLevels(2)}
  colorScale={COLORS}
>
  <HeatGraph.Grid className="gap-[3px]">
    {({ cells }) =>
      cells.map((cell) => (
        <HeatGraph.Cell
          key={\`\${cell.column}-\${cell.row}\`}
          className="aspect-square rotate-45 scale-[0.72]"
        />
      ))
    }
  </HeatGraph.Grid>
</HeatGraph.Root>`;

const CODE_MOOD = `const COLORS = ["#121212", "#b91c1c", "#1e1e1e", "#16a34a"];

<HeatGraph.Root
  data={data}
  weekStart="monday"
  classify={() => (count) => Math.max(0, count - 1)}
  colorScale={COLORS}
>
  <HeatGraph.Grid className="gap-[3px]">
    {({ cells }) =>
      cells.map((cell) => (
        <HeatGraph.Cell
          key={\`\${cell.column}-\${cell.row}\`}
          className="aspect-square rounded-[2px]"
        />
      ))
    }
  </HeatGraph.Grid>
</HeatGraph.Root>`;

const CODE_SNIPPETS: Record<ThemeName, string> = {
  Contributions: CODE_CONTRIBUTIONS,
  "Steps Walked": CODE_STEPS,
  "Gym Tracker": CODE_GYM,
  "Mood Tracker": CODE_MOOD,
};

// ---------------------------------------------------------------------------
// Main demo
// ---------------------------------------------------------------------------

export function HeatGraphDemo() {
  const contributions = useMemo(() => generateContributions(), []);
  const steps = useMemo(() => generateSteps(), []);
  const gym = useMemo(() => generateGym(), []);
  const mood = useMemo(() => generateMood(), []);
  const [activeTheme, setActiveTheme] = useState<ThemeName>("Contributions");

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-fit flex-col gap-4">
        {/* Theme tabs */}
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {THEME_NAMES.map((name) => {
            const shapes = SWATCH_STYLES[name];
            const colors = THEME_SWATCHES[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTheme(name)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                  activeTheme === name
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex gap-0.5">
                  {colors.map((c, i) => {
                    const shape = shapes[i % shapes.length]!;
                    return (
                      <span
                        key={c}
                        className={shape.className}
                        style={{ backgroundColor: c, ...shape.style }}
                      />
                    );
                  })}
                </span>
                {name}
              </button>
            );
          })}
        </div>

        {/* Graph — only render active tab */}
        <div className="overflow-x-auto">
          {activeTheme === "Contributions" && (
            <ContributionsGraph data={contributions} />
          )}
          {activeTheme === "Steps Walked" && <StepsGraph data={steps} />}
          {activeTheme === "Gym Tracker" && <GymGraph data={gym} />}
          {activeTheme === "Mood Tracker" && <MoodGraph data={mood} />}
        </div>

        {/* Code */}
        <div className="overflow-hidden rounded-xl border border-border/50">
          <SyntaxHighlighter
            language="tsx"
            code={CODE_SNIPPETS[activeTheme]}
            addDefaultStyles={false}
            className="[&_pre]:m-0 [&_pre]:rounded-none [&_pre]:bg-muted/30! [&_pre]:p-4"
          />
        </div>
      </div>
    </div>
  );
}
