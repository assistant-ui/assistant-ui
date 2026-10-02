import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { AgentCursor } from "../../../packages/ui/src/components/react/ui/base/agent-cursor";
import { PreviewChat } from "../../bundle-shared/chat";
import "./styles.css";

type Task = { id: string; title: string; owner: string; done: boolean };
type Filter = "all" | "open" | "done";
type Cursor = {
  target: HTMLElement | { x: number; y: number } | null;
  phase: "idle" | "moving" | "clicking";
};

const initialTasks: Task[] = [
  {
    id: "welcome",
    title: "Write the welcome email",
    owner: "You",
    done: false,
  },
  {
    id: "billing",
    title: "Review the billing flow",
    owner: "Maya",
    done: false,
  },
  {
    id: "research",
    title: "Share customer interviews",
    owner: "Jon",
    done: true,
  },
  {
    id: "checklist",
    title: "Publish the launch checklist",
    owner: "You",
    done: false,
  },
];

const storageKey = "aui-bundle-website-agent-tasks-v1";

function readTasks(): Task[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    if (
      Array.isArray(saved) &&
      saved.every(
        (task: unknown) =>
          typeof task === "object" &&
          task !== null &&
          "id" in task &&
          typeof task.id === "string" &&
          "title" in task &&
          typeof task.title === "string" &&
          "owner" in task &&
          typeof task.owner === "string" &&
          "done" in task &&
          typeof task.done === "boolean",
      )
    )
      return saved as Task[];
  } catch {
    // The board remains usable when browser storage is unavailable.
  }
  return initialTasks;
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(readTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [cursor, setCursor] = useState<Cursor>({ target: null, phase: "idle" });
  const [activity, setActivity] = useState("Waiting for an instruction");
  const [running, setRunning] = useState(false);
  const tasksRef = useRef(tasks);
  const filterRef = useRef(filter);
  const boardRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lifetime = useRef<AbortController | null>(null);
  const operation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    tasksRef.current = tasks;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch {
      /* Storage is optional for the local demo. */
    }
  }, [tasks]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const updateTask = (id: string) =>
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );

  const findButton = (selector: string) => {
    const element =
      boardRef.current?.querySelector<HTMLButtonElement>(selector);
    if (!element)
      throw new Error("This control is no longer available. Try again.");
    return element;
  };

  const moveTo = async (
    element: HTMLElement,
    text: string,
    signal: AbortSignal,
  ) => {
    signal.throwIfAborted();
    element.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
    setActivity(text);
    setCursor({ target: element, phase: "moving" });
    await wait(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 620,
      signal,
    );
  };

  const click = async (selector: string, text: string, signal: AbortSignal) => {
    const button = findButton(selector);
    await moveTo(button, text, signal);
    signal.throwIfAborted();
    if (!button.isConnected || button.disabled)
      throw new Error("This control is no longer available. Try again.");
    setCursor({ target: button, phase: "clicking" });
    button.click();
    await wait(460, signal);
    setCursor({ target: button, phase: "idle" });
  };

  const onPrompt = async (text: string, externalSignal: AbortSignal) => {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    const cancel = () => controller.abort();
    externalSignal.addEventListener("abort", cancel, { once: true });
    lifetime.current?.signal.addEventListener("abort", cancel, { once: true });
    if (externalSignal.aborted || lifetime.current?.signal.aborted)
      controller.abort();
    const signal = controller.signal;
    setRunning(true);
    const prompt = text.toLowerCase();
    try {
      if (/reset|start over/.test(prompt)) {
        await click(
          '[data-action="reset"]',
          "Resetting the sample board",
          signal,
        );
        signal.throwIfAborted();
        if (
          tasksRef.current.length !== initialTasks.length ||
          !initialTasks.every((sample) =>
            tasksRef.current.some(
              (task) =>
                task.id === sample.id &&
                task.title === sample.title &&
                task.done === sample.done,
            ),
          )
        )
          throw new Error(
            "The board was not reset. Try the Reset board button.",
          );
        setActivity("Sample board restored");
        return "I restored the four sample tasks. The Reset board button performed the same action you can perform yourself.";
      }
      if (/add|create/.test(prompt)) {
        const quoted = text.match(/[“"](.+?)[”"]/u)?.[1];
        const title =
          (
            quoted ??
            text
              .replace(
                /^.*?\b(?:add|create)\s+(?:a\s+)?(?:task\s*)?(?:called\s*)?/i,
                "",
              )
              .replace(/[.!]$/, "")
          )
            .trim()
            .slice(0, 120) || "Review onboarding copy";
        if (filterRef.current !== "all")
          await click('[data-filter="all"]', "Showing every task", signal);
        const input = inputRef.current;
        if (!input) throw new Error("The task field is no longer available.");
        await moveTo(input, "Entering the new task", signal);
        signal.throwIfAborted();
        input.focus({ preventScroll: true });
        input.value = title;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await wait(260, signal);
        const previousIds = new Set(tasksRef.current.map((task) => task.id));
        await click(
          '[data-action="add"]',
          "Adding the task to the board",
          signal,
        );
        signal.throwIfAborted();
        const added = tasksRef.current.find(
          (task) => !previousIds.has(task.id) && task.title === title,
        );
        if (!added)
          throw new Error(
            "The task was not added. Try the task form directly.",
          );
        setActivity("Task added");
        return `Added “${title}” through the task form. You can edit the board yourself or ask me to complete a task.`;
      }
      if (/\b(?:complete|finish)\b|\bmark\b.*\bdone\b/.test(prompt)) {
        const openTasks = tasksRef.current.filter((task) => !task.done);
        const namedTask = tasksRef.current.find((item) =>
          prompt.includes(item.title.toLowerCase()),
        );
        if (namedTask?.done) return `“${namedTask.title}” is already complete.`;
        const task = namedTask ?? openTasks[0];
        if (!task)
          return "Every task is already complete. Add another task or reset the board to try again.";
        if (filterRef.current === "done")
          await click('[data-filter="open"]', "Showing open tasks", signal);
        await click(
          `[data-task-id="${CSS.escape(task.id)}"]`,
          `Completing ${task.title}`,
          signal,
        );
        signal.throwIfAborted();
        if (!tasksRef.current.find((current) => current.id === task.id)?.done)
          throw new Error("The task was not completed. Try its task control.");
        setActivity("Task completed");
        return `Completed “${task.title}” by clicking its task control. You can click it again to reopen the task.`;
      }
      if (/show|filter|view/.test(prompt)) {
        const nextFilter: Filter = /completed|done|finished/.test(prompt)
          ? "done"
          : /open|active|incomplete/.test(prompt)
            ? "open"
            : "all";
        await click(
          `[data-filter="${nextFilter}"]`,
          `Showing ${nextFilter === "all" ? "every" : nextFilter === "done" ? "completed" : "open"} task`,
          signal,
        );
        signal.throwIfAborted();
        if (filterRef.current !== nextFilter)
          throw new Error("The view was not updated. Try the task filters.");
        setActivity("View updated");
        const count = tasksRef.current.filter(
          (task) =>
            nextFilter === "all" ||
            (nextFilter === "done" ? task.done : !task.done),
        ).length;
        return `I selected ${nextFilter === "all" ? "All tasks" : nextFilter === "done" ? "Completed" : "Open"}. This view contains ${count} ${count === 1 ? "task" : "tasks"}. You can use the same filters above the board.`;
      }
      setActivity("Waiting for an instruction");
      return "This scripted local demo can filter, complete, add, and reset tasks. Try “Show open tasks”, “Complete the first open task”, or ‘Add a task called “Review onboarding copy”’. No request is sent to a model.";
    } catch (error) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      setActivity("Action failed");
      return error instanceof Error
        ? error.message
        : "The action could not finish. Try again.";
    } finally {
      externalSignal.removeEventListener("abort", cancel);
      lifetime.current?.signal.removeEventListener("abort", cancel);
      if (
        operation.current === controller &&
        !lifetime.current?.signal.aborted
      ) {
        setRunning(false);
        setCursor((current) => ({ ...current, phase: "idle" }));
        if (signal.aborted) setActivity("Action stopped");
      }
    }
  };

  const visibleTasks = tasks.filter(
    (task) => filter === "all" || (filter === "open" ? !task.done : task.done),
  );
  const completed = tasks.filter((task) => task.done).length;

  return (
    <main className="website-demo">
      <div className="website-demo-heading">
        <div>
          <span className="website-demo-caption">WEBSITE USE</span>
          <h1>An agent that works where you do.</h1>
          <p>
            Ask for a change. Watch the cursor operate the same controls you
            use.
          </p>
        </div>
        <span className="website-demo-mode">Scripted local demo</span>
      </div>
      <div className="website-demo-layout">
        <section
          className="website-demo-board"
          aria-label="Launchpad task board"
          ref={boardRef}
        >
          <header className="website-demo-app-header">
            <span className="website-demo-wordmark">
              Launchpad<span aria-hidden="true">↗</span>
            </span>
            <span className="website-demo-workspace">Sample workspace</span>
          </header>
          <div className="website-demo-board-heading">
            <div>
              <span className="website-demo-caption">PROJECT / 01</span>
              <h2>Spring launch</h2>
              <p>
                {tasks.length - completed} open · {completed} completed
              </p>
            </div>
            <Button
              variant="outline"
              className="website-demo-reset"
              type="button"
              data-action="reset"
              onClick={() => {
                setTasks(initialTasks);
                setFilter("all");
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Reset board
            </Button>
          </div>
          <div
            className="website-demo-filters"
            role="group"
            aria-label="Filter tasks"
          >
            {(["all", "open", "done"] as const).map((value) => (
              <Button
                variant="outline"
                className="aria-pressed:bg-foreground aria-pressed:text-background"
                type="button"
                key={value}
                data-filter={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all"
                  ? "All tasks"
                  : value === "done"
                    ? "Completed"
                    : "Open"}
                <span>
                  {
                    tasks.filter(
                      (task) =>
                        value === "all" ||
                        (value === "open" ? !task.done : task.done),
                    ).length
                  }
                </span>
              </Button>
            ))}
          </div>
          <div className="website-demo-table-heading" aria-hidden="true">
            <span>Task</span>
            <span>Owner</span>
          </div>
          <ul className="website-demo-tasks">
            {visibleTasks.map((task) => (
              <li key={task.id} data-done={task.done}>
                <Button
                  variant="outline"
                  type="button"
                  className="website-demo-task-toggle"
                  data-task-id={task.id}
                  aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`}
                  aria-pressed={task.done}
                  onClick={() => updateTask(task.id)}
                >
                  <span className="website-demo-checkbox" aria-hidden="true">
                    {task.done ? "✓" : ""}
                  </span>
                  <span>{task.title}</span>
                </Button>
                <span className="website-demo-owner">{task.owner}</span>
              </li>
            ))}
          </ul>
          {visibleTasks.length === 0 && (
            <p className="website-demo-empty">
              {filter === "open"
                ? "All tasks are complete."
                : filter === "done"
                  ? "No completed tasks yet."
                  : "Add a task to start the board."}
            </p>
          )}
          <form
            className="website-demo-add"
            onSubmit={(event) => {
              event.preventDefault();
              const title = inputRef.current?.value.trim().slice(0, 120);
              if (!title) {
                inputRef.current?.focus();
                return;
              }
              setTasks((current) => [
                ...current,
                { id: crypto.randomUUID(), title, owner: "You", done: false },
              ]);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <label className="website-demo-sr-only" htmlFor="new-task">
              New task title
            </label>
            <Input
              id="new-task"
              ref={inputRef}
              name="task"
              maxLength={120}
              placeholder="Add a task to the launch…"
              autoComplete="off"
            />
            <Button variant="outline" data-action="add" type="submit">
              Add task
            </Button>
          </form>
          <footer className="website-demo-board-footer">
            <span
              aria-live="polite"
              role="status"
              className="website-demo-activity"
              data-running={running}
            >
              <i aria-hidden="true" />
              {activity}
            </span>
            <span>Browser-local tasks</span>
          </footer>
        </section>
        <aside
          className="website-demo-assistant"
          aria-label="Website agent chat"
        >
          <PreviewChat
            title="Website agent"
            intro="Let’s work through your tasks."
            suggestions={[
              "Show open tasks",
              "Complete the first open task",
              'Add a task called "Review onboarding copy"',
              "Show completed tasks",
            ]}
            onPrompt={onPrompt}
          />
        </aside>
      </div>
      <p className="website-demo-footnote">
        The cursor targets real elements. Filters, task controls, and the task
        form also work with your mouse or keyboard.
      </p>
      <AgentCursor
        target={cursor.target}
        phase={cursor.phase}
        visible={running}
        label="Agent"
      />
    </main>
  );
}
