export type FormulaRange = {
  getHeight: () => number;
  getWidth: () => number;
  setFormula: (formula: string) => FormulaRange;
  setFormulas: (formulas: string[][]) => FormulaRange;
};

const columnLabelToIndex = (columnLabel: string) => {
  let result = 0;
  for (const char of columnLabel.toUpperCase()) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }
  return result;
};

const indexToColumnLabel = (index: number) => {
  let next = index;
  let label = "";

  while (next > 0) {
    const remainder = (next - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    next = Math.floor((next - 1) / 26);
  }

  return label || "A";
};

export const ensureFormulaPrefix = (formula: string) => {
  const trimmed = formula.trim();
  return trimmed.startsWith("=") ? trimmed : `=${trimmed}`;
};

const isTopLevelIfError = (formula: string) => {
  const normalized = ensureFormulaPrefix(formula);
  const expression = normalized.slice(1).trim();
  const match = /^IFERROR\s*\(/i.exec(expression);
  if (!match) return false;

  const openParenIndex = expression.indexOf("(", match.index);
  let depth = 0;

  for (let i = openParenIndex; i < expression.length; i += 1) {
    const char = expression[i];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;

    if (depth === 0) {
      return expression.slice(i + 1).trim().length === 0;
    }
  }

  return false;
};

export const ensureSafeFormula = (formula: string) => {
  const normalized = ensureFormulaPrefix(formula);
  if (isTopLevelIfError(normalized)) return normalized;
  return `=IFERROR(${normalized.slice(1)},"")`;
};

export const shiftFormulaReferences = (
  formula: string,
  rowOffset: number,
  columnOffset: number,
) => {
  const normalized = ensureFormulaPrefix(formula);

  return normalized.replace(
    /(\$?)([A-Z]{1,3})(\$?)(\d+)/g,
    (
      full,
      colAbs: string,
      colLabel: string,
      rowAbs: string,
      rowText: string,
    ) => {
      const baseCol = columnLabelToIndex(colLabel);
      const baseRow = Number.parseInt(rowText, 10);
      if (!Number.isFinite(baseCol) || !Number.isFinite(baseRow)) {
        return full;
      }

      const nextCol =
        colAbs === "$"
          ? colLabel.toUpperCase()
          : indexToColumnLabel(Math.max(1, baseCol + columnOffset));
      const nextRow =
        rowAbs === "$" ? baseRow : Math.max(1, baseRow + rowOffset);

      return `${colAbs}${nextCol}${rowAbs}${nextRow}`;
    },
  );
};

export const buildShiftedFormulaGrid = (
  formula: string,
  rows: number,
  columns: number,
) => {
  const normalized = ensureFormulaPrefix(formula);

  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) =>
      shiftFormulaReferences(normalized, rowIndex, columnIndex),
    ),
  );
};

export const applyFormulaToRange = (
  targetRange: FormulaRange,
  formula: string,
) => {
  const safeFormula = ensureSafeFormula(formula);
  const rows = targetRange.getHeight();
  const columns = targetRange.getWidth();

  if (rows === 1 && columns === 1) {
    targetRange.setFormula(safeFormula);
  } else {
    targetRange.setFormulas(
      buildShiftedFormulaGrid(safeFormula, rows, columns),
    );
  }

  return {
    formula: safeFormula,
    rows,
    columns,
  };
};
