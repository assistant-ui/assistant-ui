"use client";

import { useEffect, useRef, useState } from "react";
import { LocaleType, Univer } from "@univerjs/core";
import { FUniver } from "@univerjs/core/facade";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import univerSheetsCorePresetEnUs from "@univerjs/preset-sheets-core/locales/en-US";
import {
  registerApplyFormulaHandler,
  registerPreviewFormulaHandler,
  registerSheetMutationHandler,
} from "@/app/lib/sheet-controller";
import {
  applyFormulaToRange,
  buildShiftedFormulaGrid,
  ensureFormulaPrefix,
  shiftFormulaReferences,
} from "@/app/lib/formula-application";

const STARTER_ROWS: (string | number)[][] = [
  ["Growth Funnel Ops (Data Quality Drill)", "", "", "", "", "", "", "", ""],
  ["Target Conv %", "8%", "", "Actual Conv %", "", "", "", "", "Define F6:F11"],
  ["Target CAC", 120, "", "Actual CAC", "", "", "", "", "Define G6:G11"],
  ["Target ROAS", 2.5, "", "Actual ROAS", "", "", "", "", "Define H6:H11"],
  [
    "Channel",
    "Spend",
    "Visitors",
    "Trials",
    "Paid",
    "Conv %",
    "CAC",
    "ROAS",
    "Notes",
  ],
  ["Google Search", 18000, 42000, 2800, 650, "", "", "", "Healthy baseline"],
  [
    "Meta Ads",
    12500,
    31000,
    1600,
    0,
    "",
    "",
    "",
    "Paid lagging in attribution feed",
  ],
  ["LinkedIn", 9000, 12000, 420, 38, "", "", "", "Low volume, high intent"],
  [
    "YouTube",
    15000,
    0,
    720,
    81,
    "",
    "",
    "",
    "Visitors missing from analytics export",
  ],
  [
    "Affiliates",
    6000,
    14000,
    "",
    96,
    "",
    "",
    "",
    "Trials blank from partner integration",
  ],
  ["Podcast", 4000, 8000, 210, 22, "", "", "", "Potential outlier channel"],
];

const normalizeCellValue = (value: string | number | boolean | null) =>
  value == null ? "" : value;

const parseA1RowBounds = (a1Range: string) => {
  const withNoSheetName = a1Range.includes("!")
    ? (a1Range.split("!").at(-1) ?? a1Range)
    : a1Range;

  const match = withNoSheetName.match(/^[A-Z]+(\d+)(?::[A-Z]+(\d+))?$/i);
  if (!match) return null;

  const start = Number.parseInt(match[1] ?? "0", 10);
  const end = Number.parseInt(match[2] ?? match[1] ?? "0", 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
};

const registerPresetPlugins = (
  univer: Univer,
  preset: ReturnType<typeof UniverSheetsCorePreset>,
) => {
  for (const pluginEntry of preset.plugins) {
    if (Array.isArray(pluginEntry)) {
      univer.registerPlugin(pluginEntry[0], pluginEntry[1]);
      continue;
    }

    univer.registerPlugin(pluginEntry);
  }
};

const isRectangular = (values: unknown[][]) => {
  if (values.length === 0) return false;

  const width = values[0]?.length ?? 0;
  if (width === 0) return false;

  return values.every((row) => row.length === width);
};

export const UniverSheetWorkspace = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [statusText, setStatusText] = useState("Booting workbook...");

  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;

    initializedRef.current = true;

    try {
      const univer = new Univer({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: univerSheetsCorePresetEnUs,
        },
      });
      const preset = UniverSheetsCorePreset({
        container: containerRef.current,
        toolbar: true,
        formulaBar: true,
        statusBarStatistic: true,
      });
      registerPresetPlugins(univer, preset);

      const univerAPI = FUniver.newAPI(univer);

      const workbook = univerAPI.createWorkbook({
        name: "Assistant Co-Edit Sheet",
      });

      const worksheet = workbook.getActiveSheet();
      worksheet.getRange("A1:I11").setValues(STARTER_ROWS);
      worksheet.getRange("A1:I1").setBackgroundColor("#dbeafe");
      worksheet.getRange("A2:I4").setBackgroundColor("#f8fafc");
      worksheet.getRange("A5:I5").setBackgroundColor("#e2e8f0");
      worksheet.getRange("A7:I7").setBackgroundColor("#fff7ed");
      worksheet.getRange("A9:I9").setBackgroundColor("#fff7ed");
      worksheet.getRange("A10:I10").setBackgroundColor("#fff7ed");

      worksheet
        .getRange("F6:F11")
        .setFormulas(buildShiftedFormulaGrid("=E6/C6", 6, 1));
      worksheet
        .getRange("G6:G11")
        .setFormulas(buildShiftedFormulaGrid("=B6/E6", 6, 1));
      worksheet
        .getRange("H6:H11")
        .setFormulas(buildShiftedFormulaGrid("=(E6*180)/B6", 6, 1));

      worksheet.getRange("D2").setFormula('=IFERROR(AVERAGE(F6:F11),"")');
      worksheet.getRange("D3").setFormula('=IFERROR(AVERAGE(G6:G11),"")');
      worksheet.getRange("D4").setFormula('=IFERROR(AVERAGE(H6:H11),"")');

      registerSheetMutationHandler(({ range, values, highlight = true }) => {
        if (!isRectangular(values)) {
          return {
            ok: false,
            error: "Values must be a non-empty rectangular 2D array.",
          };
        }

        try {
          const nextValues = values.map((row) =>
            row.map((value) => normalizeCellValue(value)),
          );
          const targetRange = workbook.getActiveSheet().getRange(range);
          targetRange.setValues(nextValues);

          if (highlight) {
            targetRange.setBackgroundColor("#d1fae5");
          }

          const columns = nextValues[0]?.length ?? 0;
          if (columns === 0) {
            return {
              ok: false,
              error: "values must contain at least one column",
            };
          }

          return {
            ok: true,
            range,
            rows: nextValues.length,
            columns,
          };
        } catch (error) {
          return {
            ok: false,
            error:
              error instanceof Error ? error.message : "Failed to update range",
          };
        }
      });

      registerApplyFormulaHandler(({ range, formula, highlight = true }) => {
        try {
          const targetRange = workbook.getActiveSheet().getRange(range);
          const applied = applyFormulaToRange(targetRange, formula);
          if (highlight) {
            targetRange.setBackgroundColor("#fef3c7");
          }

          return {
            ok: true,
            range,
            formula: applied.formula,
            rows: applied.rows,
            columns: applied.columns,
          };
        } catch (error) {
          return {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to apply formula",
          };
        }
      });

      registerPreviewFormulaHandler(({ range, formula, sampleRows = 5 }) => {
        try {
          const rowBounds = parseA1RowBounds(range);
          if (!rowBounds) {
            return {
              ok: false,
              error: "Preview currently supports A1 ranges with row numbers.",
            };
          }

          const clampedSampleRows = Math.max(1, Math.min(sampleRows, 8));
          const workbookSheet = workbook.getActiveSheet();
          const rowsToPreview = Math.min(
            clampedSampleRows,
            rowBounds.end - rowBounds.start + 1,
          );
          const normalizedFormula = ensureFormulaPrefix(formula);
          const firstFormulaRow =
            Number.parseInt(normalizedFormula.match(/\d+/)?.[0] ?? "", 10) ||
            rowBounds.start;

          const previewRows = Array.from(
            { length: rowsToPreview },
            (_, idx) => {
              const row = rowBounds.start + idx;
              const shiftedFormula = shiftFormulaReferences(
                normalizedFormula,
                row - firstFormulaRow,
                0,
              );
              const context = workbookSheet
                .getRange(`A${row}:E${row}`)
                .getDisplayValues()[0]
                ?.map((value) => String(value ?? "")) ?? ["", "", "", "", ""];

              return {
                row,
                formula: shiftedFormula,
                context,
              };
            },
          );

          return {
            ok: true,
            range,
            sampleRows: previewRows,
          };
        } catch (error) {
          return {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to preview range",
          };
        }
      });

      setStatus("ready");
      setStatusText("Workbook ready");

      return () => {
        registerSheetMutationHandler(null);
        registerApplyFormulaHandler(null);
        registerPreviewFormulaHandler(null);
        univer.dispose();
        initializedRef.current = false;
      };
    } catch (error) {
      setStatus("error");
      setStatusText(
        error instanceof Error ? error.message : "Failed to boot workbook",
      );
      registerSheetMutationHandler(null);
      registerApplyFormulaHandler(null);
      registerPreviewFormulaHandler(null);
      return;
    }
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">
            Shared Spreadsheet Workspace
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "ready"
                  ? "bg-emerald-500"
                  : status === "loading"
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
            />
            <span className="text-muted-foreground">{statusText}</span>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 bg-white">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      <footer className="border-t bg-muted/30 px-4 py-2 text-muted-foreground text-xs">
        Tip: ask for a metric-definition decision, for example{" "}
        <code>
          Show the metric definition panel for CAC in G6:G11 and apply the best
          option
        </code>
        .
      </footer>
    </section>
  );
};
