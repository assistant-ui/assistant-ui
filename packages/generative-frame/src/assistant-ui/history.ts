import { parseSpecStream } from "../spec/stream";
import type { Spec } from "../spec/types";
import { applyWidgetEdits, type WidgetEdit } from "../tools/edits";

type ToolCallLike = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
};

/** The part of a thread message the history readers need. */
export type MessageLike = { readonly content: string | readonly unknown[] };

function* toolCalls(messages: readonly MessageLike[]) {
  for (const message of messages) {
    if (typeof message.content === "string") continue;
    for (const part of message.content) {
      const call = part as ToolCallLike;
      if (call?.type === "tool-call" && call.toolCallId && call.toolName) {
        yield {
          id: call.toolCallId,
          name: call.toolName,
          args: (call.args ?? {}) as Record<string, unknown>,
        };
      }
    }
  }
}

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

/**
 * The spec a `render_spec` call's patches apply onto: the result of the
 * earlier `render_spec` calls with the same title in the thread.
 */
export function resolveSpecBase(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): Spec | undefined {
  let spec: Spec | undefined;
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) return spec;
    if (call.name !== "render_spec" || call.args["title"] !== title) continue;
    if (call.args["spec"] && typeof call.args["spec"] === "object") {
      spec = { state: {}, ...(call.args["spec"] as Spec) };
    } else if (typeof call.args["patches"] === "string") {
      spec = parseSpecStream(
        call.args["patches"],
        spec ? { initial: spec } : {},
      ).spec;
    }
  }
  return spec;
}
