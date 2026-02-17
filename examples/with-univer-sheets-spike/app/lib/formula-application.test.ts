import { describe, expect, it, vi } from "vitest";
import {
  applyFormulaToRange,
  buildShiftedFormulaGrid,
  shiftFormulaReferences,
} from "./formula-application";

describe("applyFormulaToRange", () => {
  it("uses per-cell formulas for multi-cell ranges to avoid formula errors", () => {
    const setFormula = vi.fn();
    const setFormulas = vi.fn();

    const range = {
      getHeight: () => 4,
      getWidth: () => 1,
      setFormula,
      setFormulas,
    };

    applyFormulaToRange(range, "=E2/D2");

    expect(setFormulas).toHaveBeenCalledOnce();
    expect(setFormulas).toHaveBeenCalledWith([
      ['=IFERROR(E2/D2,"")'],
      ['=IFERROR(E3/D3,"")'],
      ['=IFERROR(E4/D4,"")'],
      ['=IFERROR(E5/D5,"")'],
    ]);
    expect(setFormula).not.toHaveBeenCalled();
  });

  it("uses setFormula for single-cell ranges", () => {
    const setFormula = vi.fn();
    const setFormulas = vi.fn();

    const range = {
      getHeight: () => 1,
      getWidth: () => 1,
      setFormula,
      setFormulas,
    };

    applyFormulaToRange(range, "SUM(A1:A3)");

    expect(setFormula).toHaveBeenCalledWith('=IFERROR(SUM(A1:A3),"")');
    expect(setFormulas).not.toHaveBeenCalled();
  });

  it("does not double-wrap formulas that already use IFERROR", () => {
    const setFormula = vi.fn();
    const setFormulas = vi.fn();

    const range = {
      getHeight: () => 1,
      getWidth: () => 1,
      setFormula,
      setFormulas,
    };

    applyFormulaToRange(range, "=IFERROR(E2/D2,0)");

    expect(setFormula).toHaveBeenCalledWith("=IFERROR(E2/D2,0)");
    expect(setFormulas).not.toHaveBeenCalled();
  });
});

describe("shiftFormulaReferences", () => {
  it("shifts row and column references while honoring absolute refs", () => {
    expect(shiftFormulaReferences("=A1+$B$2+C$3+$D4", 2, 1)).toBe(
      "=B3+$B$2+D$3+$D6",
    );
  });

  it("builds a rectangular grid of shifted formulas", () => {
    expect(buildShiftedFormulaGrid("=A1", 2, 2)).toEqual([
      ["=A1", "=B1"],
      ["=A2", "=B2"],
    ]);
  });
});
