import type { ReactNode } from "react";

/**
 * One real-world case of a chart form. `chart` is a rendered diagrammatic
 * component with live data; the first example doubles as the index-wall glyph.
 */
export type DemoExample = {
  title: string;
  note: string;
  chart: ReactNode;
};
