"use client";

import { memo, useEffect, useRef } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useToolUIRenderer, useToolUIRuntime } from "../context/ToolUIContext";
import type { ToolUIInstance } from "@assistant-ui/tool-ui-runtime";

/**
 * Renders Tool UI instances inline under assistant messages.
 */
export const ToolUIInline = memo(() => {
  const runtime = useToolUIRuntime();
  const renderer = useToolUIRenderer();

  const message = useAuiState((s) => s.message);

  if (!message || message.role !== "assistant") {
    return null;
  }

  const toolCallParts = message.parts.filter(
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
          <ToolUIInlineMount
            key={part.toolCallId}
            instance={instance}
            renderer={renderer}
          />
        );
      })}
    </>
  );
});

ToolUIInline.displayName = "ToolUIInline";

/**
 * Mounts a single Tool UI instance into the DOM
 */
const ToolUIInlineMount = memo(
  ({
    instance,
    renderer,
  }: {
    instance: ToolUIInstance;
    renderer: ReturnType<typeof useToolUIRenderer>;
  }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      renderer.mount(instance, container);

      return () => {
        renderer.unmount(instance);
      };
    }, [instance, renderer]);

    return (
      <div
        ref={containerRef}
        style={{
          marginTop: 8,
          borderRadius: 6,
          overflow: "hidden",
        }}
      />
    );
  },
);

ToolUIInlineMount.displayName = "ToolUIInlineMount";
