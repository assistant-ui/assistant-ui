/**
 * Marks a generative toolkit entry as a frontend tool whose executor will be
 * supplied by `useAuiToolOverrides(...)`.
 *
 * `stubTool()` has no runtime implementation. It must be used inside a
 * `"use generative"` toolkit file so the compiler can strip it. The model sees
 * the entry's `description` and `parameters` through the server build, but
 * until a mounted `useAuiToolOverrides` supplies an `execute`, a call to the
 * tool has no executor and stays without a result.
 *
 * @example
 * ```tsx
 * manage_tasks: {
 *   description: "Add, toggle, or clear tasks on the board.",
 *   parameters: manageTasksParameters,
 *   execute: stubTool(),
 *   renderText: { running: "Updating tasks…", complete: "Tasks updated" },
 * },
 * ```
 */
export function stubTool(): never {
  throw new Error(
    "[assistant-ui] stubTool() has no runtime implementation - it marks a " +
      "tool executor that must be supplied via useAuiToolOverrides(...). Make " +
      'sure this module is compiled as "use generative".',
  );
}
