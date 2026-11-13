"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TreeNode = {
  name: string;
  /** The full path of a file; folders have none. */
  path?: string;
  children: TreeNode[];
};

export function buildFileTree(paths: readonly string[]): TreeNode[] {
  const root: TreeNode = { name: "", children: [] };
  for (const path of paths) {
    const segments = path.split("/");
    let node = root;
    segments.forEach((name, index) => {
      const isFile = index === segments.length - 1;
      let child = node.children.find(
        (entry) => entry.name === name && (entry.path === undefined) !== isFile,
      );
      if (!child) {
        child = { name, children: [], ...(isFile ? { path } : {}) };
        node.children.push(child);
      }
      node = child;
    });
  }
  return sortFoldersFirst(root.children);
}

function sortFoldersFirst(nodes: TreeNode[]): TreeNode[] {
  return [
    ...nodes.filter((node) => node.path === undefined),
    ...nodes.filter((node) => node.path !== undefined),
  ].map((node) => ({ ...node, children: sortFoldersFirst(node.children) }));
}

const row =
  "hover:bg-foreground/[0.04] focus-visible:outline-foreground/30 flex w-full items-center gap-1.5 rounded-sm py-1 pe-2 text-start font-mono text-[12.5px] [font-variant-ligatures:none] focus-visible:outline-1";

const indent = (depth: number) => ({
  paddingInlineStart: `${0.5 + depth * 0.875}rem`,
});

function Folder({
  node,
  depth,
  active,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  active: string;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(row, "text-muted-foreground")}
        style={indent(depth)}
      >
        <ChevronRightIcon
          aria-hidden
          className={cn(
            "size-3 shrink-0 transition-[rotate] motion-reduce:transition-none",
            open && "rotate-90",
          )}
        />
        <span className="truncate">{node.name}</span>
      </button>
      {open ? (
        <Entries
          nodes={node.children}
          depth={depth + 1}
          active={active}
          onSelect={onSelect}
        />
      ) : null}
    </li>
  );
}

function Entries({
  nodes,
  depth,
  active,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  active: string;
  onSelect: (path: string) => void;
}) {
  return (
    <ul role="list">
      {nodes.map((node) => {
        const { path } = node;
        return path === undefined ? (
          <Folder
            key={`${node.name}/`}
            node={node}
            depth={depth}
            active={active}
            onSelect={onSelect}
          />
        ) : (
          <li key={path}>
            <button
              type="button"
              aria-current={path === active ? "true" : undefined}
              onClick={() => onSelect(path)}
              className={cn(
                row,
                "aria-[current=true]:bg-foreground/[0.06] aria-[current=true]:text-foreground text-foreground/70",
              )}
              // A file sits one chevron further in than the folder that holds it.
              style={indent(depth + 1)}
            >
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function BlockFileTree({
  paths,
  active,
  onSelect,
}: {
  paths: readonly string[];
  active: string;
  onSelect: (path: string) => void;
}) {
  return (
    <nav aria-label="Block files">
      <Entries
        nodes={buildFileTree(paths)}
        depth={0}
        active={active}
        onSelect={onSelect}
      />
    </nav>
  );
}
