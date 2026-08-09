"use client";

import { TodoList, type TodoItem } from "@/components/elements/todo-list";
import { useStoryPhases } from "./use-demo";

const REVISIONS: readonly (readonly TodoItem[])[] = [
  [
    { id: "read", text: "Read the failing test", status: "active" },
    { id: "fix", text: "Fix the converter", status: "pending" },
    { id: "verify", text: "Re-run the suite", status: "pending" },
  ],
  [
    { id: "read", text: "Read the failing test", status: "done" },
    { id: "fix", text: "Fix the converter", status: "active" },
    { id: "verify", text: "Re-run the suite", status: "pending" },
  ],
  [
    { id: "read", text: "Read the failing test", status: "done" },
    { id: "fix", text: "Fix the converter", status: "done" },
    { id: "guard", text: "Add a guard for empty parts", status: "active" },
    { id: "verify", text: "Re-run the suite", status: "pending" },
  ],
  [
    { id: "read", text: "Read the failing test", status: "done" },
    { id: "fix", text: "Fix the converter", status: "done" },
    { id: "guard", text: "Add a guard for empty parts", status: "done" },
    { id: "verify", text: "Re-run the suite", status: "done" },
  ],
];

const PHASES = [2000, 2200, 2400, 0] as const;

export function TodoListDemo() {
  const { phase } = useStoryPhases(PHASES);
  const items = REVISIONS[Math.min(phase, REVISIONS.length - 1)]!;

  return <TodoList items={items} revision={Math.min(phase, 3) + 1} />;
}
