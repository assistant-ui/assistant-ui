import type { ClassifyFn } from "../types";

export const autoLevels = (n: number): ClassifyFn => {
  return (counts: number[]) => {
    let max = 0;
    for (const c of counts) {
      if (c > max) max = c;
    }
    if (max === 0) return () => 0;

    return (count: number) => {
      if (count <= 0) return 0;
      const level = Math.ceil((count / max) * (n - 1));
      return Math.min(level, n - 1);
    };
  };
};
