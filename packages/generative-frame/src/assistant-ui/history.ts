import { applyWidgetEdits, type WidgetEdit } from "../tools/edits";
import { toolCalls, type MessageLike } from "./tool-calls";

export type { MessageLike };

/**
 * The code of a widget right after the `show_widget` or `edit_widget` call
 * `toolCallId`, replayed from the thread: shows set the title's code, edits
 * apply to it. Undefined when the call is unknown or its edits do not apply.
 */
export function resolveWidgetCode(
  messages: readonly MessageLike[],
  toolCallId: string,
): string | undefined {
  const codes = new Map<string, string>();
  for (const call of toolCalls(messages)) {
    const title =
      typeof call.args["title"] === "string" ? call.args["title"] : "";
    let code: string | undefined;
    if (
      call.name === "show_widget" &&
      typeof call.args["widget_code"] === "string"
    ) {
      code = call.args["widget_code"];
    } else if (
      call.name === "edit_widget" &&
      Array.isArray(call.args["edits"])
    ) {
      const previous = codes.get(title);
      const applied =
        previous === undefined
          ? undefined
          : applyWidgetEdits(previous, call.args["edits"] as WidgetEdit[]);
      code = applied?.ok ? applied.code : undefined;
    }
    if (code !== undefined) codes.set(title, code);
    if (call.id === toolCallId) return code;
  }
  return undefined;
}

/**
 * The `show_widget` call that created the widget a `show_widget` or
 * `edit_widget` call renders, so every version of a widget can share a
 * host-chosen storage id. Undefined when the call or its widget is unknown.
 */
export function resolveWidgetOrigin(
  messages: readonly MessageLike[],
  toolCallId: string,
): string | undefined {
  const origins = new Map<string, string>();
  for (const call of toolCalls(messages)) {
    const title =
      typeof call.args["title"] === "string" ? call.args["title"] : "";
    if (call.name === "show_widget") origins.set(title, call.id);
    if (call.id === toolCallId) {
      return call.name === "show_widget" || call.name === "edit_widget"
        ? origins.get(title)
        : undefined;
    }
  }
  return undefined;
}
