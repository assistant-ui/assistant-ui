"use client";

import { useAuiState } from "@assistant-ui/react";
import { useMemo } from "react";

type InspectedCall = {
  id: string;
  name: string;
  body: string;
  result: string | undefined;
};

const textOf = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

/** What the model wrote for each tool call in the latest assistant message: spec patches, widget code, or arguments. */
export function ToolCallInspector() {
  const messages = useAuiState((s) => s.thread.messages);
  const calls = useMemo<InspectedCall[]>(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
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
          result:
            part.toolName === "search_flights" && part.result !== undefined
              ? textOf(part.result)
              : undefined,
        },
      ];
    });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <p className="text-muted-foreground border-b px-4 py-2 text-xs">
        Tool calls in the latest answer
      </p>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {calls.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            The latest answer called no tools, so it is Markdown.
          </p>
        ) : (
          calls.map((call) => (
            <section key={call.id} className="space-y-2">
              <h2 className="font-mono text-sm font-medium">{call.name}</h2>
              <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed whitespace-pre">
                {call.body}
              </pre>
              {call.result !== undefined ? (
                <>
                  <h3 className="text-muted-foreground text-xs">Result</h3>
                  <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed whitespace-pre">
                    {call.result}
                  </pre>
                </>
              ) : null}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
