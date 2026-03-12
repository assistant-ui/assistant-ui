"use client";

import type { ReactNode } from "react";
import { CellContext, useHeatGraphContext } from "./context";
import type { CellData } from "./types";

export type CellCollection = {
  map: (fn: (cell: CellData) => ReactNode) => ReactNode[];
};

export const useCells = (): CellCollection => {
  const { cells } = useHeatGraphContext();
  return {
    map: (fn) =>
      cells.map((cell) => (
        <CellContext key={`${cell.column}-${cell.row}`} value={cell}>
          {fn(cell)}
        </CellContext>
      )),
  };
};
