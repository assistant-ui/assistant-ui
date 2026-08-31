"use client";

import { useEffect, useState } from "react";
import {
  CodeRunner,
  type RunState,
} from "@/components/assistant-ui/elements/code-runner";

const CODE = `const queue = createMessageQueue(driver);
queue.enqueue("also add a changeset");
console.log(queue.size);`;

const OUTPUT = ["1", "→ drains when the run settles"];

export function CodeRunnerDemo() {
  const [state, setState] = useState<RunState>("ok");

  useEffect(() => {
    if (state !== "running") return;
    const id = setTimeout(() => setState("ok"), 1400);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <CodeRunner
      language="typescript"
      code={CODE}
      state={state}
      output={state === "running" ? [] : OUTPUT}
      {...(state === "ok" ? { durationMs: 38 } : {})}
      onRun={() => setState("running")}
    />
  );
}
