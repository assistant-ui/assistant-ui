"use client";

import type { ComponentProps } from "react";
import { ChevronDownIcon, FileIcon, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";
import { take } from "./range";

export interface FileTreeNode {
  path: string;
  name: string;
  depth: number;
  kind: "folder" | "file";
  additions?: number;
  deletions?: number;
}

export function FileTree({
  nodes,
  visibleCount,
  totalAdditions,
  totalDeletions,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "nodes" | "visibleCount" | "totalAdditions" | "totalDeletions"
> & {
  nodes: readonly FileTreeNode[];
  visibleCount: number;
  totalAdditions: number;
  totalDeletions: number;
}) {
  const files = nodes.filter((node) => node.kind === "file").length;

  return (
    <div
      data-slot="file-tree"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-2 rounded-2xl p-3.5",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between px-1">
        <span className="text-[13.5px] font-medium">{files} files changed</span>
        <span className={cn(mono, "tabular-nums")}>
          <span className="text-emerald-600 dark:text-emerald-400">
            +{totalAdditions}
          </span>{" "}
          <span className="text-red-600 dark:text-red-400">
            −{totalDeletions}
          </span>
        </span>
      </div>

      <div className="flex flex-col">
        {take(nodes, visibleCount).map((node) => (
          <div
            key={node.path}
            className="fade-in slide-in-from-left-1 animate-in fill-mode-both hover:bg-foreground/[0.03] flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] transition-colors duration-300"
            style={{ paddingInlineStart: `${0.25 + node.depth * 0.85}rem` }}
          >
            {node.kind === "folder" ? (
              <>
                <ChevronDownIcon className="text-foreground/25 size-3 shrink-0" />
                <FolderIcon className="text-foreground/35 size-3.5 shrink-0" />
                <span className="text-foreground/60 min-w-0 flex-1 truncate">
                  {node.name}
                </span>
              </>
            ) : (
              <>
                <FileIcon className="text-foreground/30 ms-3 size-3.5 shrink-0" />
                <span className="text-foreground/85 min-w-0 flex-1 truncate">
                  {node.name}
                </span>
                <span className={cn(mono, "shrink-0 tabular-nums")}>
                  {node.additions ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{node.additions}
                    </span>
                  ) : null}{" "}
                  {node.deletions ? (
                    <span className="text-red-600 dark:text-red-400">
                      −{node.deletions}
                    </span>
                  ) : null}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
