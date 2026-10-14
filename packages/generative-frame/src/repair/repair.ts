import type { ConsoleEntry, WidgetError } from "../protocol";
import { applyWidgetEdits, type WidgetEdit } from "../tools/edits";

/** What one render of a widget produced; `previewWidget` returns a compatible shape. */
export type RenderReport = {
  errors: WidgetError[];
  console: ConsoleEntry[];
  blank: boolean;
  height?: number;
  screenshot?: string;
};

export type RepairFeedback = {
  ok: boolean;
  round: number;
  errors: WidgetError[];
  /** Warnings and errors from the console, most recent last. */
  console: ConsoleEntry[];
  blank: boolean;
  height?: number;
  screenshot?: string;
  /** The feedback as text for a tool result or follow-up message. */
  text: string;
};

export type GenerateContext = {
  round: number;
  /** The code from the previous round; undefined in the first round. */
  previousCode: string | undefined;
  /** Feedback on the previous round; undefined in the first round. */
  feedback: RepairFeedback | undefined;
};

/** Either complete new code or exact replacements on the previous round's code. */
export type GenerateResult = string | { edits: WidgetEdit[] };

export type RepairRound = {
  round: number;
  code: string;
  report: RenderReport;
  feedback: RepairFeedback;
};

export type RepairLoopOptions = {
  generate(context: GenerateContext): Promise<GenerateResult>;
  render(code: string): Promise<RenderReport>;
  /** Rounds including the first generation. Defaults to 3. */
  maxRounds?: number;
  /** Decides whether a render is good enough. Defaults to no errors and not blank. */
  accept?(report: RenderReport): boolean;
  /** Console entries carried into feedback. Defaults to 20. */
  consoleLimit?: number;
  /** Forward the screenshot to `generate`. Defaults to true. */
  includeScreenshot?: boolean;
};

export type RepairLoopResult = {
  ok: boolean;
  code: string;
  report: RenderReport;
  rounds: RepairRound[];
};

const defaultAccept = (report: RenderReport) =>
  report.errors.length === 0 && !report.blank;

const describeError = (error: WidgetError) => {
  const location =
    error.line !== undefined
      ? ` (line ${error.line}${error.column !== undefined ? `:${error.column}` : ""})`
      : "";
  const source =
    error.source && error.kind !== "error" ? ` [${error.source}]` : "";
  return `- ${error.kind}: ${error.message}${location}${source}`;
};

/** Turns a render report into structured, model-readable feedback. */
export function buildRepairFeedback(
  report: RenderReport,
  options: {
    round?: number;
    ok?: boolean;
    consoleLimit?: number;
    includeScreenshot?: boolean;
  } = {},
): RepairFeedback {
  const ok = options.ok ?? defaultAccept(report);
  const consoleExcerpt = report.console
    .filter((entry) => entry.level === "warn" || entry.level === "error")
    .slice(-(options.consoleLimit ?? 20));

  const lines: string[] = [];
  if (ok) {
    lines.push("The widget rendered without errors.");
  } else {
    lines.push("The widget did not render cleanly. Fix the causes below.");
  }
  if (report.errors.length > 0) {
    lines.push(
      "",
      `Errors (${report.errors.length}):`,
      ...report.errors.map(describeError),
    );
  }
  if (report.blank) {
    lines.push(
      "",
      "The widget rendered blank: nothing visible ended up on screen. Check that content is not hidden, that script-drawn areas have an explicit height, and that scripts ran without errors.",
    );
  }
  if (consoleExcerpt.length > 0) {
    lines.push(
      "",
      "Console:",
      ...consoleExcerpt.map((entry) => `- ${entry.level}: ${entry.message}`),
    );
  }
  if (report.height !== undefined) {
    lines.push("", `Rendered height: ${report.height}px.`);
  }

  const includeScreenshot = options.includeScreenshot ?? true;
  return {
    ok,
    round: options.round ?? 1,
    errors: report.errors,
    console: consoleExcerpt,
    blank: report.blank,
    ...(report.height !== undefined ? { height: report.height } : {}),
    ...(includeScreenshot && report.screenshot
      ? { screenshot: report.screenshot }
      : {}),
    text: lines.join("\n"),
  };
}

/**
 * Generates a widget, renders it, and feeds structured feedback back into
 * generation until a render is accepted or the round budget runs out. Returns
 * the best attempt: the last accepted one, otherwise the one with the fewest
 * errors.
 */
export async function repairLoop(
  options: RepairLoopOptions,
): Promise<RepairLoopResult> {
  const maxRounds = Math.max(1, options.maxRounds ?? 3);
  const accept = options.accept ?? defaultAccept;
  const rounds: RepairRound[] = [];
  let previousCode: string | undefined;
  let feedback: RepairFeedback | undefined;

  for (let round = 1; round <= maxRounds; round++) {
    const generated = await options.generate({ round, previousCode, feedback });
    let code: string;
    let report: RenderReport;
    if (typeof generated === "string") {
      code = generated;
      report = await options.render(code);
    } else {
      const applied = applyWidgetEdits(previousCode ?? "", generated.edits);
      if (applied.ok) {
        code = applied.code;
        report = await options.render(code);
      } else {
        code = previousCode ?? "";
        report = {
          errors: [
            {
              kind: "error",
              message: `Edits were not applied: ${applied.error}`,
            },
          ],
          console: [],
          blank: false,
        };
      }
    }

    const ok = accept(report);
    feedback = buildRepairFeedback(report, {
      round,
      ok,
      ...(options.consoleLimit !== undefined
        ? { consoleLimit: options.consoleLimit }
        : {}),
      ...(options.includeScreenshot !== undefined
        ? { includeScreenshot: options.includeScreenshot }
        : {}),
    });
    rounds.push({ round, code, report, feedback });
    previousCode = code;
    if (ok) return { ok: true, code, report, rounds };
  }

  const best = rounds.reduce((a, b) =>
    b.report.errors.length + (b.report.blank ? 1 : 0) <
    a.report.errors.length + (a.report.blank ? 1 : 0)
      ? b
      : a,
  );
  return { ok: false, code: best.code, report: best.report, rounds };
}
