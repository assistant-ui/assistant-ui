import type { WidgetHandle } from "../widget";

export type CodeUpdate =
  | { type: "none" }
  | { type: "append"; chunk: string }
  | { type: "replace"; code: string };

/** Decides how to move a widget from the code it has to `next`. */
export function planCodeUpdate(current: string, next: string): CodeUpdate {
  if (next === current) return { type: "none" };
  if (next.startsWith(current)) {
    return { type: "append", chunk: next.slice(current.length) };
  }
  return { type: "replace", code: next };
}

const ignore = () => {};

/**
 * Brings a widget in line with a code prop that is either complete or still
 * growing: only the new suffix is written while it grows, `end` runs once it
 * stops, and anything that is not an extension replaces the widget's code.
 */
export function syncWidgetCode(
  widget: Pick<WidgetHandle, "code" | "ended" | "write" | "end" | "replace">,
  code: string,
  streaming: boolean,
): void {
  const plan = planCodeUpdate(widget.code, code);
  if (widget.ended || plan.type === "replace") {
    if (plan.type !== "none") void widget.replace(code).catch(ignore);
    return;
  }
  if (plan.type === "append") widget.write(plan.chunk);
  if (!streaming && code.length > 0) void widget.end().catch(ignore);
}
