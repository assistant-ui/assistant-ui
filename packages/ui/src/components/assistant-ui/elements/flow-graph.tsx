"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { take } from "../utils/range";

export type FlowNodeState = "done" | "active" | "pending";

export interface FlowNode {
  id: string;
  label: string;
  column: number;
  row: number;
  state: FlowNodeState;
}

export interface FlowEdge {
  from: string;
  to: string;
}

const COL_W = 96;
const ROW_H = 58;
const NODE_W = 78;
const NODE_H = 30;

export function FlowGraph({
  nodes,
  edges,
  visibleCount,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "nodes" | "edges" | "visibleCount"
> & {
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  visibleCount: number;
}) {
  const shown = take(nodes, visibleCount);
  const shownIds = new Set(shown.map((node) => node.id));
  const columns = Math.max(0, ...nodes.map((node) => node.column)) + 1;
  const rows = Math.max(0, ...nodes.map((node) => node.row)) + 1;
  const width = (columns - 1) * COL_W + NODE_W;
  const height = (rows - 1) * ROW_H + NODE_H;

  const center = (node: FlowNode) => ({
    x: node.column * COL_W + NODE_W / 2,
    y: node.row * ROW_H + NODE_H / 2,
  });

  return (
    <div
      data-slot="flow-graph"
      className={cn(
        paper,
        "w-full max-w-md overflow-x-auto rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="relative" style={{ width, height, minWidth: width }}>
        <svg
          aria-hidden
          className="absolute inset-0 overflow-visible"
          width={width}
          height={height}
        >
          {edges.map((edge) => {
            const from = nodes.find((node) => node.id === edge.from);
            const to = nodes.find((node) => node.id === edge.to);
            if (!from || !to) return null;
            const live = shownIds.has(edge.from) && shownIds.has(edge.to);
            const a = center(from);
            const b = center(to);
            const midX = (a.x + b.x) / 2;
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M ${a.x + NODE_W / 2} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - NODE_W / 2} ${b.y}`}
                fill="none"
                strokeWidth="1.5"
                className={cn(
                  "transition-opacity duration-500 motion-reduce:transition-none",
                  live ? "stroke-foreground/20" : "stroke-foreground/5",
                )}
              />
            );
          })}
        </svg>

        {shown.map((node) => (
          <div
            key={node.id}
            className={cn(
              "fade-in zoom-in-95 animate-in fill-mode-both absolute flex items-center justify-center rounded-xl border text-center text-[11.5px] leading-tight duration-300",
              node.state === "done" &&
                "border-foreground/10 bg-foreground/[0.04] text-foreground/50",
              node.state === "active" &&
                "text-foreground/90 border-blue-500/30 bg-blue-500/10 dark:border-blue-400/30",
              node.state === "pending" &&
                "border-foreground/8 text-foreground/35 border-dashed",
            )}
            style={{
              left: node.column * COL_W,
              top: node.row * ROW_H,
              width: NODE_W,
              height: NODE_H,
            }}
          >
            <span className={cn(mono, "px-2")}>{node.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
