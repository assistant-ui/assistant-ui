/**
 * Marks a generative toolkit entry as a frontend tool whose executor will be
 * supplied by `useAuiToolOverrides(...)`.
 *
 * `stubTool()` has no runtime implementation. It must be used inside a
 * `"use generative"` toolkit file so the compiler can strip it.
 */
export function stubTool(): never {
  throw new Error(
    "[assistant-ui] stubTool() has no runtime implementation - it marks a " +
      "tool executor that must be supplied via useAuiToolOverrides(...). Make " +
      'sure this module is compiled as "use generative".',
  );
}
