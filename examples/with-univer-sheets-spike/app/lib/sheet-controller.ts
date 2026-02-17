export type SpreadsheetPrimitive = string | number | boolean | null;

export type SpreadsheetMatrix = SpreadsheetPrimitive[][];

export type UpdateSheetRangeInput = {
  range: string;
  values: SpreadsheetMatrix;
  highlight?: boolean;
};

export type UpdateSheetRangeResult =
  | {
      ok: true;
      range: string;
      rows: number;
      columns: number;
    }
  | {
      ok: false;
      error: string;
    };

export type ApplyFormulaInput = {
  range: string;
  formula: string;
  highlight?: boolean;
};

export type ApplyFormulaResult =
  | {
      ok: true;
      range: string;
      formula: string;
      rows: number;
      columns: number;
    }
  | {
      ok: false;
      error: string;
    };

export type FormulaPreviewRow = {
  row: number;
  formula: string;
  context: string[];
};

export type PreviewFormulaInput = {
  range: string;
  formula: string;
  sampleRows?: number;
};

export type PreviewFormulaResult =
  | {
      ok: true;
      range: string;
      sampleRows: FormulaPreviewRow[];
    }
  | {
      ok: false;
      error: string;
    };

type SheetMutationHandler = (
  input: UpdateSheetRangeInput,
) => UpdateSheetRangeResult;
type ApplyFormulaHandler = (input: ApplyFormulaInput) => ApplyFormulaResult;
type PreviewFormulaHandler = (
  input: PreviewFormulaInput,
) => PreviewFormulaResult;

let activeSheetMutationHandler: SheetMutationHandler | null = null;
let activeApplyFormulaHandler: ApplyFormulaHandler | null = null;
let activePreviewFormulaHandler: PreviewFormulaHandler | null = null;

export const registerSheetMutationHandler = (
  handler: SheetMutationHandler | null,
) => {
  activeSheetMutationHandler = handler;
};

export const registerApplyFormulaHandler = (
  handler: ApplyFormulaHandler | null,
) => {
  activeApplyFormulaHandler = handler;
};

export const registerPreviewFormulaHandler = (
  handler: PreviewFormulaHandler | null,
) => {
  activePreviewFormulaHandler = handler;
};

export const updateSheetRange = (
  input: UpdateSheetRangeInput,
): UpdateSheetRangeResult => {
  if (!activeSheetMutationHandler) {
    return {
      ok: false,
      error:
        "The spreadsheet is still loading. Ask the user to retry in a moment.",
    };
  }

  return activeSheetMutationHandler(input);
};

export const applyFormula = (input: ApplyFormulaInput): ApplyFormulaResult => {
  if (!activeApplyFormulaHandler) {
    return {
      ok: false,
      error:
        "The spreadsheet is still loading. Ask the user to retry in a moment.",
    };
  }

  return activeApplyFormulaHandler(input);
};

export const previewFormula = (
  input: PreviewFormulaInput,
): PreviewFormulaResult => {
  if (!activePreviewFormulaHandler) {
    return {
      ok: false,
      error:
        "The spreadsheet is still loading. Ask the user to retry in a moment.",
    };
  }

  return activePreviewFormulaHandler(input);
};
