import { useState } from "react";
import {
  CodeRunner,
  type RunState,
} from "@assistant-ui/ui/components/assistant-ui/elements/code-runner.tsx";
import { defineSections } from "../types";

const CODE = `const queue = createMessageQueue(driver);
queue.enqueue("also add a changeset");
console.log(queue.size);`;

const OUTPUT: Record<RunState, string[]> = {
  idle: [],
  running: [],
  ok: ["1", "→ drains when the run settles"],
  error: ["TypeError: Cannot read properties of undefined (reading 'enqueue')"],
};

function Runner({ initial }: { initial: RunState }) {
  const [state, setState] = useState<RunState>(initial);
  return (
    <CodeRunner
      language="typescript"
      code={CODE}
      state={state}
      output={OUTPUT[state]}
      {...(state === "ok" ? { durationMs: 38 } : {})}
      onRun={() => {
        setState("running");
        setTimeout(() => setState("ok"), 1400);
      }}
    />
  );
}

export default defineSections([
  {
    id: "code-runner",
    title: "Code runner",
    category: "content",
    notes: "A finished run with output; Run replays it.",
    render: () => <Runner initial="ok" />,
  },
  {
    id: "code-runner-states",
    title: "Code runner states",
    category: "content",
    notes: "Running before output arrives, then a run that threw.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Runner initial="running" />
        <Runner initial="error" />
      </div>
    ),
  },
]);
