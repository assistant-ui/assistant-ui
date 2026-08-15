import type { ReactNode } from "react";

/**
 * One real-world case of a chart form, told as a story: `setup` is the
 * situation (who is looking at this and why), `chart` is live fake data with
 * readable labels, `read` is what the data says. The first example doubles as
 * the index-wall glyph.
 */
export type DemoExample = {
  title: string;
  setup: string;
  read: string;
  chart: ReactNode;
};
