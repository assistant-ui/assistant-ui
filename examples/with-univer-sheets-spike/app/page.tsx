"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  makeAssistantTool,
  Suggestions,
  useAui,
  useAssistantInstructions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo, useState } from "react";
import { z } from "zod";
import { UniverSheetWorkspace } from "./UniverSheetWorkspace";
import {
  applyFormula,
  previewFormula,
  updateSheetRange,
} from "@/app/lib/sheet-controller";

const SpreadsheetValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const WORKSPACE_SUGGESTIONS = Suggestions([
  {
    title: "Fix Conv% Definition",
    label: "choose policy + apply to F6:F11",
    prompt:
      "Show the metric definition panel for conversion rate in F6:F11 and apply the best option for executive reporting",
  },
  {
    title: "Fix CAC Definition",
    label: "compare dashboard-safe vs ops-safe",
    prompt:
      "Compare formula options for CAC in G6:G11 and apply the option that avoids noisy errors while keeping trend visibility",
  },
  {
    title: "Fix ROAS Definition",
    label: "preview KPI impact before commit",
    prompt:
      "Show definition options for ROAS in H6:H11 and explain the KPI impact before applying",
  },
  {
    title: "Data Quality Triage",
    label: "find rows causing metric instability",
    prompt:
      "Identify which channels are causing formula instability in rows 6 to 11 and propose fixes",
  },
  {
    title: "What-If Scenario",
    label: "add a new channel + recalc metrics",
    prompt:
      "Add a TikTok row with Spend 11000, Visitors 26000, Trials 1300, Paid 170, then update related metrics",
  },
]);

type FormulaProposal = {
  id: string;
  agent: string;
  formula: string;
  rationale: string;
  confidence: number;
  handling?: string;
  impact?: string;
};

type FormulaCouncilProps = {
  title?: string;
  goal?: string;
  metricLabel?: string;
  targetRange: string;
  proposals: FormulaProposal[];
  expectedCount?: number;
  streaming?: boolean;
  stage?: string;
};

type PreviewRow = {
  row: number;
  formula: string;
  context: string[];
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const isFormulaProposal = (value: unknown): value is FormulaProposal => {
  if (typeof value !== "object" || value === null) return false;
  const proposal = value as Partial<FormulaProposal>;
  return (
    typeof proposal.id === "string" &&
    typeof proposal.agent === "string" &&
    typeof proposal.formula === "string" &&
    typeof proposal.rationale === "string" &&
    typeof proposal.confidence === "number"
  );
};

const parseRowRange = (a1Range: string) => {
  const segment = a1Range.includes("!")
    ? (a1Range.split("!").at(-1) ?? a1Range)
    : a1Range;
  const match = segment.match(/^[A-Z]{1,3}(\d+)(?::[A-Z]{1,3}(\d+))?$/i);
  if (!match) return null;
  const start = Number.parseInt(match[1] ?? "", 10);
  const end = Number.parseInt(match[2] ?? match[1] ?? "", 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
};

const columnToIndex = (label: string) => {
  let value = 0;
  for (const char of label.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value - 1;
};

const parseNumeric = (raw: string | undefined) => {
  if (!raw) return null;
  const normalized = raw.replace(/[$,%\s,]/g, "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractOperandColumns = (formula: string) => {
  const numeratorCol = formula.match(/([A-Z]{1,3})\d+/i)?.[1]?.toUpperCase();
  const denominatorCol = formula
    .match(/\/\s*\(?\s*([A-Z]{1,3})\d+/i)?.[1]
    ?.toUpperCase();
  const multiplier = Number.parseFloat(
    formula.match(/\*\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? "1",
  );

  if (!numeratorCol || !denominatorCol) return null;
  return {
    numeratorIdx: columnToIndex(numeratorCol),
    denominatorIdx: columnToIndex(denominatorCol),
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
  };
};

const formatAverage = (value: number | null) => {
  if (value == null) return "n/a";
  if (Math.abs(value) <= 1) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(2);
};

const estimateImpact = (formula: string, sampleRows: PreviewRow[]) => {
  if (sampleRows.length === 0) return null;
  const columns = extractOperandColumns(sampleRows[0]?.formula ?? formula);
  if (!columns) return null;

  const fallbackZero = /IFERROR\([^,]+,\s*0\s*\)/i.test(formula);
  const marksReview = /"REVIEW"/i.test(formula);
  const rounds = /ROUND\(/i.test(formula);
  let validRows = 0;
  let blankRows = 0;
  let zeroRows = 0;
  let reviewRows = 0;
  let runningTotal = 0;

  for (const row of sampleRows) {
    const numerator = parseNumeric(row.context[columns.numeratorIdx]);
    const denominator = parseNumeric(row.context[columns.denominatorIdx]);
    const hasError =
      numerator == null || denominator == null || denominator === 0;

    if (hasError) {
      if (marksReview) {
        reviewRows += 1;
      } else if (fallbackZero) {
        zeroRows += 1;
        validRows += 1;
      } else {
        blankRows += 1;
      }
      continue;
    }

    const ratio = (numerator * columns.multiplier) / denominator;
    const value = rounds ? Number(ratio.toFixed(4)) : ratio;
    runningTotal += value;
    validRows += 1;
  }

  return {
    validRows,
    blankRows,
    zeroRows,
    reviewRows,
    sampleCount: sampleRows.length,
    average: validRows > 0 ? runningTotal / validRows : null,
  };
};

const FormulaCouncilPart = ({ props }: { props: unknown }) => {
  const aui = useAui();
  const rootProps = readRecord(props) ?? {};
  const specProps = readRecord(rootProps.spec);
  const payload = (specProps ?? rootProps) as Partial<FormulaCouncilProps>;
  const proposals = Array.isArray(payload.proposals)
    ? payload.proposals.filter(isFormulaProposal)
    : [];
  const targetRange = payload.targetRange ?? "F6:F11";
  const expectedCount = Math.max(payload.expectedCount ?? 3, proposals.length);
  const isStreaming = Boolean(
    payload.streaming ?? proposals.length < expectedCount,
  );
  const rowBounds = parseRowRange(targetRange);
  const [selectedId, setSelectedId] = useState(proposals[0]?.id ?? "");
  const selectedProposal =
    proposals.find((proposal) => proposal.id === selectedId) ?? proposals[0];
  const previewResult =
    selectedProposal &&
    previewFormula({
      range: targetRange,
      formula: selectedProposal.formula,
      sampleRows: 5,
    });
  const impact =
    selectedProposal && previewResult?.ok
      ? estimateImpact(selectedProposal.formula, previewResult.sampleRows)
      : null;

  const queueApplyViaTool = () => {
    if (!selectedProposal) return;
    const payload = JSON.stringify({
      range: targetRange,
      formula: selectedProposal.formula,
      agent: selectedProposal.agent,
      proposalId: selectedProposal.id,
    });

    aui.thread().append({
      role: "user",
      content: [
        {
          type: "text",
          text: `APPLY_FORMULA::${payload}`,
        },
      ],
    });
  };

  return (
    <div className="my-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">
            {payload.title ?? "Metric Definition Panel"}
          </h3>
          <p className="mt-1 text-muted-foreground text-xs">
            {payload.goal ??
              "Choose the metric definition policy before mutating cells"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {payload.metricLabel ?? "Metric"} · rows{" "}
            {rowBounds ? `${rowBounds.start}-${rowBounds.end}` : "n/a"}
          </p>
          {isStreaming ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {payload.stage ?? "Streaming candidates..."}
            </p>
          ) : null}
        </div>
        <div className="rounded-md border bg-background px-2 py-1 font-mono text-[11px]">
          {targetRange}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {proposals.map((proposal) => {
          const selected = proposal.id === selectedProposal?.id;

          return (
            <button
              key={proposal.id}
              type="button"
              onClick={() => setSelectedId(proposal.id)}
              className={`rounded-lg border p-2 text-left transition ${
                selected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                  : "bg-background hover:bg-muted/40"
              }`}
            >
              <div className="font-semibold text-xs">{proposal.agent}</div>
              {proposal.handling ? (
                <div className="mt-1 text-[11px] text-foreground/80">
                  {proposal.handling}
                </div>
              ) : null}
              <div className="mt-1 font-mono text-[11px]">
                {proposal.formula}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {proposal.rationale}
              </div>
              {proposal.impact ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {proposal.impact}
                </div>
              ) : null}
              <div className="mt-2 text-[10px] text-muted-foreground">
                confidence {Math.round(proposal.confidence * 100)}%
              </div>
            </button>
          );
        })}
        {isStreaming
          ? Array.from({
              length: Math.max(0, expectedCount - proposals.length),
            }).map((_, index) => (
              <div
                key={`proposal-skeleton-${index}`}
                className="animate-pulse rounded-lg border bg-background p-2"
              >
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="mt-2 h-2 w-32 rounded bg-muted" />
                <div className="mt-2 h-2 w-full rounded bg-muted" />
                <div className="mt-1 h-2 w-5/6 rounded bg-muted" />
              </div>
            ))
          : null}
      </div>

      {selectedProposal ? (
        <div className="mt-3 rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-xs">
              Preview for {selectedProposal.agent}
            </p>
            <button
              type="button"
              onClick={queueApplyViaTool}
              disabled={isStreaming}
              className="rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1 font-semibold text-[11px] text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply Definition
            </button>
          </div>

          <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[11px]">
            {selectedProposal.formula}
          </pre>

          {impact ? (
            <div className="mt-2 grid gap-2 text-[11px] md:grid-cols-4">
              <div className="rounded border bg-muted/30 px-2 py-1">
                avg {formatAverage(impact.average)}
              </div>
              <div className="rounded border bg-muted/30 px-2 py-1">
                valid {impact.validRows}/{impact.sampleCount}
              </div>
              <div className="rounded border bg-muted/30 px-2 py-1">
                blanks {impact.blankRows} · zeros {impact.zeroRows}
              </div>
              <div className="rounded border bg-muted/30 px-2 py-1">
                review flags {impact.reviewRows}
              </div>
            </div>
          ) : null}

          {previewResult?.ok ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-2 pb-1">Row</th>
                    <th className="pr-2 pb-1">Formula</th>
                    <th className="pb-1">Context A:E</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.sampleRows.map((row) => (
                    <tr key={row.row} className="border-t">
                      <td className="py-1 pr-2 font-mono">{row.row}</td>
                      <td className="py-1 pr-2 font-mono">{row.formula}</td>
                      <td className="py-1 font-mono text-muted-foreground">
                        {row.context.join(" | ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-rose-600">
              {previewResult?.ok === false
                ? previewResult.error
                : "Preview unavailable"}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const UpdateSheetRangeTool = makeAssistantTool({
  toolName: "update_sheet_range",
  description:
    "Update a rectangular range in the shared spreadsheet using A1 notation.",
  parameters: z.object({
    range: z
      .string()
      .min(2)
      .describe("A1 range like A1, B2:D4, or Sheet1!A1:C3"),
    values: z
      .array(z.array(SpreadsheetValueSchema))
      .min(1)
      .describe("Rectangular 2D cell values for the target range"),
    highlight: z
      .boolean()
      .optional()
      .describe("Whether to highlight the edited cells"),
  }),
  execute: async ({ range, values, highlight }) => {
    const widths = new Set(values.map((row) => row.length));
    if (widths.size > 1 || values[0]?.length === 0) {
      return {
        ok: false,
        error: "values must be a non-empty rectangular 2D array",
      };
    }

    return updateSheetRange({
      range,
      values,
      ...(highlight === undefined ? {} : { highlight }),
    });
  },
  render: ({ args, status, result }) => (
    <div className="my-2 rounded-lg border bg-muted/30 p-3 text-xs">
      <p className="font-semibold">update_sheet_range</p>
      <p className="mt-1 font-mono text-muted-foreground">{args.range}</p>
      {status.type === "running" ? (
        <p className="mt-2 text-muted-foreground">Applying changes...</p>
      ) : result ? (
        <p className="mt-2">
          {"range" in result
            ? `Updated ${result.range} (${result.rows}x${result.columns})`
            : `Failed: ${result.error}`}
        </p>
      ) : null}
    </div>
  ),
});

const ApplyFormulaTool = makeAssistantTool({
  toolName: "apply_formula",
  description:
    "Apply a formula to an A1 range in the shared spreadsheet. Use for deterministic sheet mutations.",
  parameters: z.object({
    range: z.string().min(2).describe("A1 range to receive the formula"),
    formula: z
      .string()
      .min(1)
      .describe("Spreadsheet formula, e.g. =IFERROR(E2/D2,0)"),
    highlight: z
      .boolean()
      .optional()
      .describe("Whether to highlight cells after applying"),
  }),
  execute: async ({ range, formula, highlight }) =>
    applyFormula({
      range,
      formula,
      ...(highlight === undefined ? {} : { highlight }),
    }),
  render: ({ args, status, result }) => (
    <div className="my-2 rounded-lg border bg-muted/30 p-3 text-xs">
      <p className="font-semibold">apply_formula</p>
      <p className="mt-1 font-mono text-muted-foreground">
        {args.range} ← {args.formula}
      </p>
      {status.type === "running" ? (
        <p className="mt-2 text-muted-foreground">Applying formula...</p>
      ) : result ? (
        <p className="mt-2">
          {"range" in result
            ? `Applied to ${result.range} (${result.rows}x${result.columns})`
            : `Failed: ${result.error}`}
        </p>
      ) : null}
    </div>
  ),
});

const PreviewFormulaTool = makeAssistantTool({
  toolName: "preview_formula",
  description:
    "Preview how a formula will expand row-by-row for a target range before applying it.",
  parameters: z.object({
    range: z.string().min(2).describe("A1 range to preview"),
    formula: z.string().min(1).describe("Formula template"),
    sampleRows: z
      .number()
      .int()
      .min(1)
      .max(8)
      .optional()
      .describe("How many rows to include in the preview"),
  }),
  execute: async ({ range, formula, sampleRows }) =>
    previewFormula({
      range,
      formula,
      ...(sampleRows === undefined ? {} : { sampleRows }),
    }),
  render: ({ result }) =>
    result && "sampleRows" in result ? (
      <div className="my-2 rounded-lg border bg-muted/30 p-3 text-xs">
        <p className="font-semibold">preview_formula</p>
        <p className="mt-1 text-muted-foreground">
          {result.range} · {result.sampleRows.length} rows
        </p>
      </div>
    ) : null,
});

const WorkspaceInstructions = () => {
  useAssistantInstructions(`
You are co-editing a spreadsheet with the user.

When the user asks to insert, revise, calculate, or reformat sheet data:
- Call update_sheet_range instead of just describing edits.
- Use A1 ranges.
- Send rectangular 2D values that match the target range shape.
- Prefer compact updates (keep under 20 rows and 10 columns per call).

When the user asks for formulas:
- Use preview_formula before apply_formula when possible.
- If the user message starts with APPLY_FORMULA:: then parse the JSON payload and call apply_formula immediately.
- Prioritize definition clarity: explain which policy is being applied (blank fallback, zero fallback, or review-flag behavior).

After each tool call, explain what changed in one concise sentence.
`);
  return null;
};

export default function Home() {
  const runtime = useChatRuntime();
  const aui = useAui({
    suggestions: WORKSPACE_SUGGESTIONS,
  });
  const assistantMessagePartComponents = useMemo(
    () => ({
      Component: {
        byName: {
          "formula-council": FormulaCouncilPart,
        },
      },
    }),
    [],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      <WorkspaceInstructions />
      <UpdateSheetRangeTool />
      <PreviewFormulaTool />
      <ApplyFormulaTool />

      <main className="grid h-dvh grid-cols-[minmax(575px,667px)_minmax(0,1fr)] bg-slate-100">
        <section className="min-h-0 p-3">
          <div className="h-full overflow-hidden rounded-xl border bg-background shadow-sm">
            <Thread
              assistantMessagePartComponents={assistantMessagePartComponents}
            />
          </div>
        </section>

        <section className="min-h-0 p-3">
          <div className="h-full overflow-hidden rounded-xl border bg-background shadow-sm">
            <UniverSheetWorkspace />
          </div>
        </section>
      </main>
    </AssistantRuntimeProvider>
  );
}
