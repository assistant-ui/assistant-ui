"use client";

import { inspectToolCalls } from "@/lib/tool-calls";
import { useAuiState } from "@assistant-ui/react";
import { useMemo } from "react";

export function ToolCallInspector() {
  const messages = useAuiState((s) => s.thread.messages);
  const calls = useMemo(() => inspectToolCalls(messages), [messages]);

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
