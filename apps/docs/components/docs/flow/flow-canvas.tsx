"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type FlowCanvasEdge = {
  from: string;
  to: string;
  label?: string;
  route?: "down" | "loop-bottom" | "loop-right";
  /** fraction of the vertical gap where the horizontal segment sits (route "down") */
  midFrac?: number;
  /** horizontal offset applied to the source anchor */
  fromOffset?: number;
  /** horizontal offset applied to the target anchor */
  toOffset?: number;
  /** distance of the loop lane from the nodes (routes "loop-bottom" / "loop-right") */
  laneOffset?: number;
};

type RenderedEdge = {
  path: string;
  head: string;
  label?: { x: number; y: number; text: string };
};

export function FlowCanvas({
  edges,
  className,
  children,
}: {
  edges: FlowCanvasEdge[];
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<RenderedEdge[]>([]);

  const measure = useCallback(() => {
    const container = ref.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const rect = (id: string) => {
      const el = container.querySelector(`[data-flow-id="${id}"]`);
      if (!el) return undefined;
      const r = el.getBoundingClientRect();
      return {
        right: r.right - box.left,
        top: r.top - box.top,
        bottom: r.bottom - box.top,
        cx: r.left - box.left + r.width / 2,
        cy: r.top - box.top + r.height / 2,
      };
    };

    const px = (n: number) => Math.round(n) + 0.5;
    const next: RenderedEdge[] = [];
    for (const e of edges) {
      const from = rect(e.from);
      const to = rect(e.to);
      if (!from || !to) continue;
      const route = e.route ?? "down";
      if (route === "down") {
        const sx = from.cx + (e.fromOffset ?? 0);
        const ex = to.cx + (e.toOffset ?? 0);
        const midY = from.bottom + (to.top - from.bottom) * (e.midFrac ?? 0.5);
        next.push({
          path: `M ${px(sx)} ${px(from.bottom)} V ${px(midY)} H ${px(ex)} V ${Math.round(to.top - 6)}`,
          head: `M ${px(ex) - 3.5} ${Math.round(to.top - 6)} L ${px(ex) + 3.5} ${Math.round(to.top - 6)} L ${px(ex)} ${Math.round(to.top)} Z`,
          label: e.label
            ? { x: (sx + ex) / 2, y: midY, text: e.label }
            : undefined,
        });
      } else if (route === "loop-bottom") {
        const sx = from.cx + (e.fromOffset ?? 0);
        const ex = to.cx + (e.toOffset ?? 0);
        const laneY = Math.max(from.bottom, to.bottom) + (e.laneOffset ?? 28);
        next.push({
          path: `M ${px(sx)} ${px(from.bottom)} V ${px(laneY)} H ${px(ex)} V ${Math.round(to.bottom + 6)}`,
          head: `M ${px(ex) - 3.5} ${Math.round(to.bottom + 6)} L ${px(ex) + 3.5} ${Math.round(to.bottom + 6)} L ${px(ex)} ${Math.round(to.bottom)} Z`,
          label: e.label
            ? { x: (sx + ex) / 2, y: laneY, text: e.label }
            : undefined,
        });
      } else {
        const laneX = Math.max(from.right, to.right) + (e.laneOffset ?? 32);
        next.push({
          path: `M ${px(from.right)} ${px(from.cy)} H ${px(laneX)} V ${px(to.cy)} H ${Math.round(to.right + 6)}`,
          head: `M ${Math.round(to.right + 6)} ${px(to.cy) - 3.5} L ${Math.round(to.right + 6)} ${px(to.cy) + 3.5} L ${Math.round(to.right)} ${px(to.cy)} Z`,
          label: e.label
            ? { x: laneX, y: (from.cy + to.cy) / 2, text: e.label }
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
    <div ref={ref} className={cn("relative", className)}>
      {children}
      <svg
        aria-hidden
        className="text-muted-foreground/70 pointer-events-none absolute inset-0 h-full w-full"
      >
        {rendered.map((e, i) => (
          <g key={i}>
            <path
              d={e.path}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            />
            <path d={e.head} fill="currentColor" />
          </g>
        ))}
      </svg>
      {rendered.map(
        (e, i) =>
          e.label && (
            <span
              key={i}
              className="bg-background text-muted-foreground absolute -translate-x-1/2 -translate-y-1/2 px-1.5 text-xs whitespace-nowrap"
              style={{ left: e.label.x, top: e.label.y }}
            >
              {e.label.text}
            </span>
          ),
      )}
    </div>
  );
}
