import type { ClassifyFn } from "../types";

export const autoLevels = (n: number): ClassifyFn => {
  return (counts: number[]) => {
    const max = Math.max(0, ...counts);

    return (count: number) => {
      if (count <= 0 || max === 0) return 0;
      const level = Math.ceil((count / max) * (n - 1));
      return Math.min(level, n - 1);
    };
  };
};
