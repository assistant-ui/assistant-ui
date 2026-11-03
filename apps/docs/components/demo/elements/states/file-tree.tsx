"use client";

import {
  FileTree,
  type FileTreeNode,
} from "@/components/assistant-ui/elements/file-tree";
import { defineStates } from "./types";

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

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The run is still listing files, so only the first three rows are in.",
    Component: () => (
      <FileTree
        nodes={NODES}
        visibleCount={3}
        totalAdditions={78}
        totalDeletions={9}
      />
    ),
  },
  {
    key: "empty",
    label: "No changes",
    note: "The run touched nothing, so the header reads zero and the list is empty.",
    Component: () => (
      <FileTree
        nodes={[]}
        visibleCount={0}
        totalAdditions={0}
        totalDeletions={0}
      />
    ),
  },
  {
    key: "deletions-only",
    label: "Deletions only",
    note: "A cleanup run where every file only lost lines.",
    Component: () => (
      <FileTree
        nodes={[
          {
            path: "legacy",
            name: "packages/react/src/legacy",
            depth: 0,
            kind: "folder",
          },
          {
            path: "legacy-draft",
            name: "useLegacyDraft.ts",
            depth: 1,
            kind: "file",
            deletions: 42,
          },
          {
            path: "legacy-thread",
            name: "LegacyThread.tsx",
            depth: 1,
            kind: "file",
            deletions: 118,
          },
          {
            path: "legacy-index",
            name: "index.ts",
            depth: 1,
            kind: "file",
            deletions: 4,
          },
        ]}
        visibleCount={4}
        totalAdditions={0}
        totalDeletions={164}
      />
    ),
  },
  {
    key: "long-content",
    label: "Deep tree",
    note: "Deep nesting and long names truncate instead of pushing the stats off the row.",
    Component: () => (
      <FileTree
        nodes={[
          { path: "a", name: "packages", depth: 0, kind: "folder" },
          { path: "b", name: "react", depth: 1, kind: "folder" },
          { path: "c", name: "src/runtimes", depth: 2, kind: "folder" },
          { path: "d", name: "remote-thread-list", depth: 3, kind: "folder" },
          {
            path: "e",
            name: "RemoteThreadListThreadListRuntimeCore.tsx",
            depth: 4,
            kind: "file",
            additions: 128,
            deletions: 61,
          },
          {
            path: "f",
            name: "RemoteThreadListHookInstanceManager.tsx",
            depth: 4,
            kind: "file",
            additions: 12,
            deletions: 40,
          },
          {
            path: "g",
            name: "remote-thread-list.integration.test.ts",
            depth: 4,
            kind: "file",
            additions: 1204,
          },
          {
            path: "h",
            name: "pnpm-lock.yaml",
            depth: 0,
            kind: "file",
            additions: 3418,
            deletions: 2977,
          },
        ]}
        visibleCount={8}
        totalAdditions={4762}
        totalDeletions={3078}
      />
    ),
  },
]);
