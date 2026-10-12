import type { ThreadMessage } from "@assistant-ui/react";

export type InspectedCall = {
  id: string;
  name: string;
  body: string;
  result: string | undefined;
};

const textOf = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

/** What the model wrote for each tool call in the latest assistant message (spec patches, widget code, or arguments) and what each call returned. */
export function inspectToolCalls(
  messages: readonly Pick<ThreadMessage, "role" | "content">[],
): InspectedCall[] {
  const last = messages.findLast((message) => message.role === "assistant");
  return (last?.content ?? []).flatMap((part) => {
    if (part.type !== "tool-call") return [];
    const args = part.args as Record<string, unknown>;
    const body =
      part.toolName === "render_spec" && typeof args["patches"] === "string"
        ? args["patches"]
        : part.toolName === "show_widget" &&
            typeof args["widget_code"] === "string"
          ? args["widget_code"]
          : part.argsText || textOf(part.args);
    return [
      {
        id: part.toolCallId,
        name: part.toolName,
        body,
        result: part.result !== undefined ? textOf(part.result) : undefined,
      },
    ];
  });
}
