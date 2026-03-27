// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuiState } from "@assistant-ui/store";
import type {
  SerializedThreadMessage,
  ThreadRecording,
} from "@assistant-ui/core";
import { ThreadReplay } from "../replay/ThreadReplay";

const makeSerializedMessage = (
  id: string,
  text: string,
): SerializedThreadMessage => ({
  id,
  role: "assistant",
  createdAt: "2026-03-25T10:00:00.000Z",
  content: [{ type: "text", text }],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const makeRecording = (
  updates: Array<{ timestamp: number; message: SerializedThreadMessage }>,
): ThreadRecording => ({
  version: 1,
  metadata: {
    createdAt: "2026-03-25T10:00:00.000Z",
    duration: updates.at(-1)?.timestamp ?? 0,
    messageCount: updates.length,
  },
  events: [
    { type: "snapshot", timestamp: 0, messages: [] },
    ...updates.map(({ timestamp, message }) => ({
      type: "message-update" as const,
      timestamp,
      messageId: message.id,
      message,
    })),
  ],
});

const ReplayState = () => {
  const ids = useAuiState((s) => s.thread.messages.map((m) => m.id).join(","));
  return <div data-testid="ids">{ids}</div>;
};

describe("ThreadReplay", () => {
  it("reconstructs messages when seeking through the recording", async () => {
    const recording = makeRecording([
      { timestamp: 1000, message: makeSerializedMessage("1", "hello") },
      { timestamp: 2000, message: makeSerializedMessage("2", "world") },
    ]);

    const { container } = render(
      <ThreadReplay recording={recording}>
        <ReplayState />
      </ThreadReplay>,
    );

    const scrubber = container.querySelector<HTMLInputElement>(
      "[data-aui-scrubber]",
    );
    expect(scrubber).not.toBeNull();
    expect(screen.getByTestId("ids").textContent).toBe("");

    fireEvent.change(scrubber!, { target: { value: "1000" } });
    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("1");
    });

    fireEvent.change(scrubber!, { target: { value: "2000" } });
    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("1,2");
    });
  });

  it("resets playback state when the recording prop changes", async () => {
    const firstRecording = makeRecording([
      { timestamp: 1000, message: makeSerializedMessage("1", "hello") },
    ]);
    const secondRecording = makeRecording([
      { timestamp: 1000, message: makeSerializedMessage("2", "goodbye") },
    ]);

    const { container, rerender } = render(
      <ThreadReplay recording={firstRecording}>
        <ReplayState />
      </ThreadReplay>,
    );

    const scrubber = container.querySelector<HTMLInputElement>(
      "[data-aui-scrubber]",
    );
    expect(scrubber).not.toBeNull();

    fireEvent.change(scrubber!, { target: { value: "1000" } });
    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("1");
    });

    rerender(
      <ThreadReplay recording={secondRecording}>
        <ReplayState />
      </ThreadReplay>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("");
    });
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });
});
