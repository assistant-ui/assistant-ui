"use client";

import { memo } from "react";
import { useAssistantState } from "../../context/react/hooks/useAssistantState";
import { useToolUIRuntime } from "../context/ToolUIContext";
import type { ToolUIInstance } from "@assistant-ui/tool-ui-runtime";

/**
 * Renders Tool UI instances inline under assistant messages.
 *
 * This is a minimal renderer that:
 * - associates tool-call message parts with ToolUIInstance objects
 * - renders lifecycle + debug info
 *
 * Real rendering (registry / sandbox / iframe) will be layered on later.
 */
export const ToolUIInline = memo(() => {
  const runtime = useToolUIRuntime();

  const message = useAssistantState(({ message }) => message);

  if (!message || message.role !== "assistant") {
    return null;
  }

  const toolCallParts = message.content.filter(
    (part): part is Extract<typeof part, { type: "tool-call" }> =>
      part.type === "tool-call",
  );

  if (toolCallParts.length === 0) {
    return null;
  }

  const instances = runtime.list();

  return (
    <>
      {toolCallParts.map((part) => {
        const instance = instances.find((inst) => inst.id === part.toolCallId);

        if (!instance) {
          // Instance not created yet (still streaming or already closed)
          return null;
        }

        return (
          <ToolUIInstanceRenderer key={part.toolCallId} instance={instance} />
        );
      })}
    </>
  );
});

ToolUIInline.displayName = "InlineToolUIRenderer";

/**
 * Minimal debug renderer for a Tool UI instance.
 *
 * This intentionally does NOT render real UI yet.
 *
 */
const ToolUIInstanceRenderer = memo(
  ({ instance }: { instance: ToolUIInstance }) => {
    const state = instance.getState();

    return (
      <div
        style={{
          marginTop: 8,
          padding: 12,
          border: "1px solid var(--aui-border, #ddd)",
          borderRadius: 6,
          background: "var(--aui-muted, #fafafa)",
          fontSize: 12,
        }}
      >
        <div>
          <strong>Tool:</strong> {state.context.toolName}
        </div>
        <div>
          <strong>Call ID:</strong> {state.context.toolCallId}
        </div>
        <div>
          <strong>Lifecycle:</strong> {state.lifecycle}
        </div>

        {state.context.args !== undefined && (
          <pre style={{ marginTop: 8 }}>
            {JSON.stringify(state.context.args, null, 2)}
          </pre>
        )}

        {state.result !== undefined && (
          <pre style={{ marginTop: 8 }}>
            Result: {JSON.stringify(state.result, null, 2)}
          </pre>
        )}
      </div>
    );
  },
);
