"use client";

import { useLangChainState } from "@assistant-ui/react-langchain";

type Todo = {
  id?: string;
  content: string;
  status?: "pending" | "in_progress" | "completed";
};

const statusIcon = (status: Todo["status"]) => {
  switch (status) {
    case "completed":
      return "✓";
    case "in_progress":
      return "◐";
    default:
      return "○";
  }
};

export function TodosPanel() {
  const todos = useLangChainState<Todo[]>("todos", []);

  if (todos.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        Todos from the agent will appear here. This panel reads{" "}
        <code className="rounded bg-muted px-1">state.todos</code> via{" "}
        <code className="rounded bg-muted px-1">useLangChainState</code>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
        Agent todos
      </h2>
      <ul className="space-y-1">
        {todos.map((todo, i) => (
          <li
            key={todo.id ?? i}
            className="flex items-start gap-2 text-sm leading-relaxed"
          >
            <span aria-hidden>{statusIcon(todo.status)}</span>
            <span
              className={
                todo.status === "completed"
                  ? "text-muted-foreground line-through"
                  : undefined
              }
            >
              {todo.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
