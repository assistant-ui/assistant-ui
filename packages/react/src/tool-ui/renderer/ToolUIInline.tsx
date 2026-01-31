"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useToolUIRenderer, useToolUIRuntime } from "../context/ToolUIContext";
import { useToolUISync } from "../hooks/useToolUISync";
import { ToolUIController } from "../ToolUIController";
import type { ToolUIInstance } from "@assistant-ui/tool-ui-runtime";

interface ToolUIInlineProps {
  /**
   * Tool call IDs that belong to this message.
   * If provided, only instances matching these IDs will be rendered.
   * If not provided, renders all instances (legacy behavior).
   */
  toolCallIds?: string[];
}

export const ToolUIInline = memo(({ toolCallIds }: ToolUIInlineProps) => {
  const runtime = useToolUIRuntime();
  const renderer = useToolUIRenderer();
  const [instances, setInstances] = useState<readonly ToolUIInstance[]>([]);

  const [_updateTrigger, setUpdateTrigger] = useState(0);

  const controller = useMemo(() => {
    if (!runtime) return null;
    return new ToolUIController(runtime);
  }, [runtime]);

  const onInstancesChanged = useCallback(() => {
    if (runtime) {
      const allInstances = runtime.list();

      let filteredInstances: readonly ToolUIInstance[];
      if (toolCallIds && toolCallIds.length > 0) {
        const toolCallIdSet = new Set(toolCallIds);
        filteredInstances = allInstances.filter((inst) =>
          toolCallIdSet.has(inst.id),
        );
      } else {
        filteredInstances = allInstances;
      }

      setInstances(filteredInstances);
      setUpdateTrigger((t) => t + 1);
    }
  }, [runtime, toolCallIds]);

  useToolUISync(controller, onInstancesChanged);

  useEffect(() => {
    if (runtime) {
      const allInstances = runtime.list();

      if (toolCallIds && toolCallIds.length > 0) {
        const toolCallIdSet = new Set(toolCallIds);
        setInstances(allInstances.filter((inst) => toolCallIdSet.has(inst.id)));
      } else {
        setInstances(allInstances);
      }
    }
  }, [runtime, toolCallIds]);

  useEffect(() => {
    if (runtime && toolCallIds && toolCallIds.length > 0) {
      const allInstances = runtime.list();
      const toolCallIdSet = new Set(toolCallIds);
      const filtered = allInstances.filter((inst) =>
        toolCallIdSet.has(inst.id),
      );

      if (
        filtered.length !== instances.length ||
        !filtered.every((inst, i) => instances[i]?.id === inst.id)
      ) {
        setInstances(filtered);
      }
    }
  }, [runtime, toolCallIds, instances]);

  if (!runtime || !renderer || !controller) {
    return null;
  }

  if (toolCallIds && toolCallIds.length > 0 && instances.length === 0) {
    return null;
  }

  return (
    <>
      {instances.map((instance) => (
        <ToolUIInlineItem
          key={instance.id}
          instance={instance}
          renderer={renderer}
          _updateTrigger={_updateTrigger}
        />
      ))}
    </>
  );
});

ToolUIInline.displayName = "ToolUIInline";

/**
 * Individual tool UI item - handles rendering for a single instance
 */
const ToolUIInlineItem = memo(
  ({
    instance,
    renderer,
    _updateTrigger,
  }: {
    instance: ToolUIInstance;
    renderer: any;
    _updateTrigger: number;
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const reactRootRef = useRef<Root | null>(null);
    const lastOutputRef = useRef<string | null>(null);
    const containerMountedRef = useRef<HTMLDivElement | null>(null);
    const [containerHeight, setContainerHeight] = useState<number | undefined>(
      undefined,
    );

    // Track result changes to trigger re-render when result arrives
    const instanceState = instance.getState();
    const _resultKey = instanceState.result
      ? JSON.stringify(instanceState.result)
      : "no-result";

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      renderer.mount(instance, container);

      const sessions = renderer.list();
      const session = sessions.find((s: any) => s.instance.id === instance.id);

      if (!session) {
        return;
      }

      // Get height from HTML output
      if (session.output.kind === "html" && session.output.height) {
        setContainerHeight(session.output.height);
      }

      // Handle React rendering ourselves
      if (session.output.kind === "react") {
        const element = session.output.element;
        if (
          !reactRootRef.current ||
          containerMountedRef.current !== container
        ) {
          if (
            reactRootRef.current &&
            containerMountedRef.current !== container
          ) {
            try {
              reactRootRef.current.unmount();
            } catch (_e) {
              // Ignore unmount errors
            }
          }
          reactRootRef.current = createRoot(container);
          containerMountedRef.current = container;
        }

        reactRootRef.current.render(element);
        lastOutputRef.current = "react";
      } else if (session.output.kind === "html") {
        // HTML is handled by renderer.mount via sandbox
        lastOutputRef.current = "html";
      } else if (session.output.kind === "empty") {
        if (lastOutputRef.current === "react" && reactRootRef.current) {
          try {
            reactRootRef.current.unmount();
          } catch (_e) {
            // Ignore unmount errors
          }
          reactRootRef.current = null;
          containerMountedRef.current = null;
        }
        container.innerHTML = "";
        lastOutputRef.current = "empty";
      }

      return () => {
        // Don't unmount here - only on full unmount
      };
    }, [instance, renderer]);

    useEffect(() => {
      return () => {
        if (reactRootRef.current) {
          const root = reactRootRef.current;
          reactRootRef.current = null;
          containerMountedRef.current = null;
          setTimeout(() => {
            try {
              root.unmount();
            } catch (_e) {
              // Ignore unmount errors - container might already be removed
            }
          }, 0);
        }
      };
    }, []);

    return (
      <div
        ref={containerRef}
        data-tool-ui-id={instance.id}
        style={{
          marginTop: 8,
          borderRadius: 6,
          overflow: "hidden",
          minHeight: containerHeight || 100,
        }}
      />
    );
  },
);

ToolUIInlineItem.displayName = "ToolUIInlineItem";
