"use client";

import { CodeRunner } from "@/components/assistant-ui/elements/code-runner";
import { defineStates } from "./types";

const noop = () => {};

const CODE = `const queue = createMessageQueue(driver);
queue.enqueue("also add a changeset");
console.log(queue.size);`;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "idle",
    label: "Not run",
    note: "The snippet has not been run, so there is no output section.",
    Component: () => (
      <CodeRunner
        language="typescript"
        code={CODE}
        state="idle"
        output={[]}
        onRun={noop}
      />
    ),
  },
  {
    key: "running",
    label: "Running",
    note: "The snippet is executing and has printed nothing yet.",
    Component: () => (
      <CodeRunner
        language="typescript"
        code={CODE}
        state="running"
        output={[]}
        onRun={noop}
      />
    ),
  },
  {
    key: "error",
    label: "Error",
    note: "The snippet threw, so the output is the error in red.",
    Component: () => (
      <CodeRunner
        language="typescript"
        code={`const queue = createMessageQueue();
queue.enqueue("also add a changeset");`}
        state="error"
        output={[
          "TypeError: Cannot read properties of undefined (reading 'subscribe')",
          "    at createMessageQueue (queue.ts:4:10)",
        ]}
        durationMs={12}
        onRun={noop}
      />
    ),
  },
  {
    key: "empty-output",
    label: "No output",
    note: "The snippet ran cleanly but printed nothing.",
    Component: () => (
      <CodeRunner
        language="python"
        code={`import json
config = json.loads('{"model": "claude-sonnet-4-5"}')`}
        state="ok"
        output={[]}
        durationMs={21}
        onRun={noop}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a run handler the play button is gone and only the result shows.",
    Component: () => (
      <CodeRunner
        language="typescript"
        code={CODE}
        state="ok"
        output={["1", "→ drains when the run settles"]}
        durationMs={38}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long output",
    note: "Wide code and many output lines scroll sideways inside the card.",
    Component: () => (
      <CodeRunner
        language="python"
        code={`import pandas as pd
df = pd.read_csv("s3://acme-analytics/exports/2026-11/events.csv", usecols=["thread_id", "model", "input_tokens", "output_tokens"])
print(df.groupby("model")[["input_tokens", "output_tokens"]].sum().sort_values("input_tokens", ascending=False))`}
        state="ok"
        output={[
          "                     input_tokens  output_tokens",
          "model",
          "claude-sonnet-4-5        18402211        2210934",
          "claude-haiku-4-5          9120448         804112",
          "gpt-4o-mini               4410093         391207",
          "claude-opus-4-1           1203377         188450",
          "gemini-2.5-flash           880216          70114",
        ]}
        durationMs={2840}
        onRun={noop}
      />
    ),
  },
]);
