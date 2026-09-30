import {
  TodoList,
  type TodoItem,
} from "@assistant-ui/ui/components/assistant-ui/elements/todo-list.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const EVERY_STATUS: readonly TodoItem[] = [
  {
    id: "read",
    text: "Read the failing test",
    description: "Trace the converter's current behavior.",
    status: "done",
  },
  { id: "fix", text: "Fix the converter", status: "active" },
  {
    id: "scope",
    text: "Rewrite the fixture",
    status: "cancelled",
    reason: "Out of scope for this change.",
  },
  {
    id: "e2e",
    text: "Run the end-to-end suite",
    status: "failed",
    reason: "The preview deployment timed out.",
  },
  { id: "verify", text: "Re-run the suite", status: "pending" },
];

const LONG: readonly TodoItem[] = Array.from({ length: 9 }, (_, i) => ({
  id: `step-${i}`,
  text:
    i === 3
      ? "Migrate every thread list adapter to the tap resource model without changing its public surface"
      : `Step ${i + 1} of the migration`,
  status: i < 3 ? "done" : i === 3 ? "active" : "pending",
}));

export default defineSections([
  {
    id: "todo-list",
    title: "Todo list",
    category: "agents",
    notes:
      "Every status: done, active, cancelled and failed with reasons, pending.",
    render: () => (
      <TodoList
        items={EVERY_STATUS}
        revision={3}
        description="Fix the converter and prove it with the suite."
      />
    ),
  },
  {
    id: "todo-list-states",
    title: "Todo list states",
    category: "agents",
    notes:
      "All pending (first revision), all done, and a long list capped by maxVisible.",
    render: () => (
      <States>
        <State label="all pending">
          <TodoList
            items={EVERY_STATUS.map((item) => ({ ...item, status: "pending" }))}
            revision={1}
          />
        </State>
        <State label="all done">
          <TodoList
            items={EVERY_STATUS.map((item) => ({ ...item, status: "done" }))}
            revision={5}
          />
        </State>
        <State label="maxVisible 5 of 9">
          <TodoList title="Migration" items={LONG} maxVisible={5} />
        </State>
      </States>
    ),
  },
]);
