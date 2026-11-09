"use client";

import {
  TodoList,
  type TodoItem,
} from "@/components/assistant-ui/elements/todo-list";
import { defineStates } from "./types";

const PENDING: readonly TodoItem[] = [
  { id: "read", text: "Read the failing test", status: "pending" },
  { id: "fix", text: "Fix the converter", status: "pending" },
  { id: "verify", text: "Re-run the suite", status: "pending" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "not-started",
    label: "Not started",
    note: "Every item is queued and none has begun.",
    Component: () => <TodoList items={PENDING} revision={1} />,
  },
  {
    key: "error",
    label: "Failed item",
    note: "An item failed with its reason and the run moved on.",
    Component: () => (
      <TodoList
        revision={3}
        items={[
          { id: "read", text: "Read the failing test", status: "done" },
          {
            id: "fix",
            text: "Fix the converter",
            status: "failed",
            reason:
              "Type error in converter.ts:42, ToolCallPart has no field args.",
          },
          {
            id: "types",
            text: "Update the part types",
            description: "Rename args to input across the message parts.",
            status: "active",
          },
          { id: "verify", text: "Re-run the suite", status: "pending" },
        ]}
      />
    ),
  },
  {
    key: "cancelled",
    label: "Dropped item",
    note: "An item the agent decided not to do stays crossed out and leaves the count.",
    Component: () => (
      <TodoList
        revision={2}
        items={[
          { id: "read", text: "Read the failing test", status: "done" },
          { id: "scope", text: "Rewrite the fixture", status: "cancelled" },
          { id: "fix", text: "Fix the converter", status: "active" },
          { id: "verify", text: "Re-run the suite", status: "pending" },
        ]}
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "Every item is complete.",
    Component: () => (
      <TodoList
        revision={4}
        description="Converter fix for empty tool results."
        items={[
          { id: "read", text: "Read the failing test", status: "done" },
          { id: "fix", text: "Fix the converter", status: "done" },
          { id: "guard", text: "Add a guard for empty parts", status: "done" },
          { id: "verify", text: "Re-run the suite", status: "done" },
        ]}
      />
    ),
  },
  {
    key: "empty",
    label: "Empty",
    note: "The list exists but has no items yet.",
    Component: () => <TodoList items={[]} />,
  },
  {
    key: "overflow",
    label: "Folded",
    note: "A long list folds finished and queued items behind a toggle but keeps the active one visible.",
    Component: () => (
      <TodoList
        title="Release 0.12"
        revision={6}
        maxVisible={3}
        items={[
          { id: "1", text: "Freeze the main branch", status: "done" },
          { id: "2", text: "Generate the changelog", status: "done" },
          { id: "3", text: "Bump package versions", status: "done" },
          { id: "4", text: "Run the full test matrix", status: "done" },
          {
            id: "5",
            text: "Publish to npm",
            description: "17 packages, in dependency order.",
            status: "active",
          },
          { id: "6", text: "Tag the release on GitHub", status: "pending" },
          {
            id: "7",
            text: "Update the docs version switcher",
            status: "pending",
          },
          { id: "8", text: "Post the release notes", status: "pending" },
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long items",
    note: "Long item text and descriptions wrap without breaking the layout.",
    Component: () => (
      <TodoList
        title="Migrate the thread list"
        description="Move every workspace from the local store to the remote adapter without losing drafts."
        items={[
          {
            id: "a",
            text: "Inventory every call site that reads from the local thread list store, including tests",
            status: "done",
          },
          {
            id: "b",
            text: "Implement the remote adapter with optimistic renames, archive, and unarchive",
            description:
              "Mirror the local adapter's API so call sites keep working, then swap the store behind a feature flag.",
            status: "active",
          },
          {
            id: "c",
            text: "Backfill existing threads and verify counts per workspace match",
            status: "pending",
          },
        ]}
      />
    ),
  },
]);
