import {
  FileTree,
  type FileTreeNode,
} from "@assistant-ui/ui/components/assistant-ui/elements/file-tree.tsx";
import { defineSections } from "../types";

const NODES: readonly FileTreeNode[] = [
  {
    path: "webview",
    name: "examples/with-vscode/webview",
    depth: 0,
    kind: "folder",
  },
  {
    path: "gallery",
    name: "gallery/sections/content-components-with-a-long-name.tsx",
    depth: 1,
    kind: "file",
    additions: 124,
  },
  {
    path: "main",
    name: "main.tsx",
    depth: 1,
    kind: "file",
    additions: 8,
    deletions: 3,
  },
  { path: "src", name: "packages/vscode/src/host", depth: 0, kind: "folder" },
  {
    path: "html",
    name: "html.ts",
    depth: 1,
    kind: "file",
    additions: 2,
    deletions: 1,
  },
  {
    path: "changeset",
    name: ".changeset/tidy-pans-shave.md",
    depth: 0,
    kind: "file",
    additions: 5,
  },
];

export default defineSections([
  {
    id: "file-tree",
    title: "File tree",
    category: "content",
    notes: "Changed files with per-file and total additions and deletions.",
    render: () => (
      <FileTree
        nodes={NODES}
        visibleCount={NODES.length}
        totalAdditions={139}
        totalDeletions={4}
      />
    ),
  },
  {
    id: "file-tree-streaming",
    title: "File tree (streaming)",
    category: "content",
    notes: "Three of six rows revealed.",
    render: () => (
      <FileTree
        nodes={NODES}
        visibleCount={3}
        totalAdditions={132}
        totalDeletions={3}
      />
    ),
  },
]);
