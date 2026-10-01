import { useEffect, useState } from "react";
import { ToolError } from "@assistant-ui/ui/components/assistant-ui/elements/tool-error.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

const ERROR = {
  name: "fetch",
  target: "https://api.example.com/v1/issues",
  message: "ETIMEDOUT after 30000ms",
};

function InteractiveToolError() {
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(1);
  useEffect(() => {
    if (!retrying) return;
    const id = setTimeout(() => {
      setRetrying(false);
      setAttempt((current) => Math.min(3, current + 1));
    }, 1200);
    return () => clearTimeout(id);
  }, [retrying]);
  return (
    <ToolError
      {...ERROR}
      attempt={attempt}
      maxAttempts={3}
      retrying={retrying}
      onRetry={() => setRetrying(true)}
      onSkip={() => setAttempt(1)}
    />
  );
}

export default defineSections([
  {
    id: "tool-error",
    title: "Tool error",
    category: "agents",
    notes: "A failed call with retry and skip; retry counts the attempts.",
    render: () => <InteractiveToolError />,
  },
  {
    id: "tool-error-states",
    title: "Tool error states",
    category: "agents",
    notes:
      "Retrying, the last attempt, no handlers (read-only) and a long error message.",
    render: () => (
      <States>
        <State label="retrying (attempt 2 of 3)">
          <ToolError
            {...ERROR}
            attempt={2}
            maxAttempts={3}
            retrying
            onRetry={noop}
            onSkip={noop}
          />
        </State>
        <State label="last attempt">
          <ToolError
            {...ERROR}
            attempt={3}
            maxAttempts={3}
            retrying={false}
            onRetry={noop}
            onSkip={noop}
          />
        </State>
        <State label="read-only">
          <ToolError {...ERROR} attempt={1} maxAttempts={1} retrying={false} />
        </State>
        <State label="long message">
          <ToolError
            name="read_file"
            target="packages/core/src/runtime/utils/thread-message-like-with-a-very-long-name.ts"
            message="ENOENT: no such file or directory, open '/workspace/packages/core/src/runtime/utils/thread-message-like-with-a-very-long-name.ts'"
            attempt={1}
            maxAttempts={3}
            retrying={false}
            onRetry={noop}
            onSkip={noop}
          />
        </State>
      </States>
    ),
  },
]);
