"use client";

import { FileTree, type FileTreeNode } from "@/components/elements/file-tree";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const NODES: readonly FileTreeNode[] = [
  { path: "packages", name: "packages/core/src", depth: 0, kind: "folder" },
  {
    path: "converter",
    name: "convertMessages.ts",
    depth: 1,
    kind: "file",
    additions: 24,
    deletions: 6,
  },
  {
    path: "converter-test",
    name: "convertMessages.test.ts",
    depth: 1,
    kind: "file",
    additions: 41,
  },
  { path: "ui", name: "packages/ui/src", depth: 0, kind: "folder" },
  {
    path: "composer",
    name: "composer.tsx",
    depth: 1,
    kind: "file",
    additions: 8,
    deletions: 3,
  },
  {
    path: "changeset",
    name: ".changeset/tidy-pans-shave.md",
    depth: 0,
    kind: "file",
    additions: 5,
  },
];

const PHASES = [420, 420, 420, 420, 420, 0] as const;

export function FileTreeDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <FileTree
      nodes={NODES}
      visibleCount={Math.min(phase + 1, NODES.length)}
      totalAdditions={78}
      totalDeletions={9}
    />
  );
}
