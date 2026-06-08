"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import { cn } from "@/lib/utils";

export type FlowCanvasEdge = {
  from: string;
  to: string;
  label?: string;
  route?: "down" | "loop-bottom" | "loop-right";
  midFrac?: number;
  fromOffset?: number;
  toOffset?: number;
  laneOffset?: number;
};

type RenderedEdge = {
  path: string;
  head: string;
  label?: { x: number; y: number; text: string } | undefined;
};

export type FlowCanvasProps = ComponentProps<"div"> & {
  edges: FlowCanvasEdge[];
};

export function FlowCanvas({
  className,
  edges,
  children,
  ...props
}: FlowCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<RenderedEdge[]>([]);

  const measure = useCallback(() => {
    const container = ref.current;
    if (!container) return;

    const box = container.getBoundingClientRect();
    const scaleX = container.offsetWidth
      ? box.width / container.offsetWidth
      : 1;
    const scaleY = container.offsetHeight
      ? box.height / container.offsetHeight
      : 1;

    const rect = (id: string) => {
      const element = container.querySelector(`[data-flow-id="${id}"]`);
      if (!element) return undefined;

      const r = element.getBoundingClientRect();
      return {
        right: (r.right - box.left) / scaleX,
        top: (r.top - box.top) / scaleY,
        bottom: (r.bottom - box.top) / scaleY,
        cx: (r.left - box.left + r.width / 2) / scaleX,
        cy: (r.top - box.top + r.height / 2) / scaleY,
      };
    };

    const px = (n: number) => Math.round(n) + 0.5;
    const next: RenderedEdge[] = [];

    for (const edge of edges) {
      const from = rect(edge.from);
      const to = rect(edge.to);
      if (!from || !to) continue;

      const route = edge.route ?? "down";

      if (route === "down") {
        const sx = from.cx + (edge.fromOffset ?? 0);
        const ex = to.cx + (edge.toOffset ?? 0);
        const midY =
          from.bottom + (to.top - from.bottom) * (edge.midFrac ?? 0.5);
        const laneX =
          edge.laneOffset === undefined ? undefined : sx + edge.laneOffset;

        next.push({
          path:
            laneX === undefined
              ? `M ${px(sx)} ${px(from.bottom)} V ${px(midY)} H ${px(ex)} V ${Math.round(to.top - 6)}`
              : `M ${px(sx)} ${px(from.bottom)} V ${px(from.bottom + 8)} H ${px(laneX)} V ${px(midY)} H ${px(ex)} V ${Math.round(to.top - 6)}`,
          head: `M ${px(ex) - 3.5} ${Math.round(to.top - 6)} L ${px(ex) + 3.5} ${Math.round(to.top - 6)} L ${px(ex)} ${Math.round(to.top)} Z`,
          label: edge.label
            ? { x: ((laneX ?? sx) + ex) / 2, y: midY, text: edge.label }
            : undefined,
        });
      } else if (route === "loop-bottom") {
        const sx = from.cx + (edge.fromOffset ?? 0);
        const ex = to.cx + (edge.toOffset ?? 0);
        const laneY =
          Math.max(from.bottom, to.bottom) + (edge.laneOffset ?? 28);

        next.push({
          path: `M ${px(sx)} ${px(from.bottom)} V ${px(laneY)} H ${px(ex)} V ${Math.round(to.bottom + 6)}`,
          head: `M ${px(ex) - 3.5} ${Math.round(to.bottom + 6)} L ${px(ex) + 3.5} ${Math.round(to.bottom + 6)} L ${px(ex)} ${Math.round(to.bottom)} Z`,
          label: edge.label
            ? { x: (sx + ex) / 2, y: laneY, text: edge.label }
            : undefined,
        });
      } else {
        const laneX = Math.max(from.right, to.right) + (edge.laneOffset ?? 32);

        next.push({
          path: `M ${px(from.right)} ${px(from.cy)} H ${px(laneX)} V ${px(to.cy)} H ${Math.round(to.right + 6)}`,
          head: `M ${Math.round(to.right + 6)} ${px(to.cy) - 3.5} L ${Math.round(to.right + 6)} ${px(to.cy) + 3.5} L ${Math.round(to.right)} ${px(to.cy)} Z`,
          label: edge.label
            ? { x: laneX, y: (from.cy + to.cy) / 2, text: edge.label }
            : undefined,
        });
      }
    }

    setRendered(next);
  }, [edges]);

  useEffect(() => {
    measure();

    const container = ref.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    let mounted = true;
    document.fonts?.ready.then(() => {
      if (mounted) measure();
    });

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [measure]);

  return (
    <div
      ref={ref}
      data-slot="flow-canvas"
      className={cn("aui-flow-canvas relative isolate", className)}
      {...props}
    >
      <svg
        aria-hidden
        data-slot="flow-canvas-edges"
        className="aui-flow-canvas-edges text-muted-foreground/70 pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      >
        {rendered.map((edge, index) => (
          <g key={index} data-slot="flow-canvas-edge">
            <path
              d={edge.path}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            />
            <path d={edge.head} fill="currentColor" />
          </g>
        ))}
      </svg>
      <div data-slot="flow-canvas-content" className="relative z-10">
        {children}
      </div>
      {rendered.map(
        (edge, index) =>
          edge.label && (
            <span
              key={index}
              data-slot="flow-canvas-label"
              className="aui-flow-canvas-label bg-background text-muted-foreground absolute z-20 -translate-x-1/2 -translate-y-1/2 px-1.5 text-xs whitespace-nowrap"
              style={{ left: edge.label.x, top: edge.label.y }}
            >
              {edge.label.text}
            </span>
          ),
      )}
    </div>
  );
}
