// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useAuiState } from "@assistant-ui/store";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import { ReadonlyThreadProvider } from "./ReadonlyThreadProvider";

const messages = (status: "running" | "complete"): readonly ThreadMessage[] => [
  {
    id: "nested-assistant",
    createdAt: new Date(0),
    role: "assistant",
    content: [],
    status:
      status === "running"
        ? { type: "running" }
        : { type: "complete", reason: "unknown" },
    metadata: {
      unstable_state: {},
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  },
];

const ThreadStatus = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  return <output data-testid="thread-running">{String(isRunning)}</output>;
};

afterEach(cleanup);

describe("ReadonlyThreadProvider", () => {
  it("reports isRunning from the trailing assistant message", async () => {
    const result = render(
      <ReadonlyThreadProvider messages={messages("running")}>
        <ThreadStatus />
      </ReadonlyThreadProvider>,
    );

    expect(screen.getByTestId("thread-running").textContent).toBe("true");

    result.rerender(
      <ReadonlyThreadProvider messages={messages("complete")}>
        <ThreadStatus />
      </ReadonlyThreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("thread-running").textContent).toBe("false");
    });
  });
});
