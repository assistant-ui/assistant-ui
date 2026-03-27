// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessage, ThreadRecording } from "@assistant-ui/core";
import { ReadonlyThreadProvider } from "../context";
import { useThreadRecorder } from "../replay/useThreadRecorder";

const makeMessage = (id: string, text: string): ThreadMessage => ({
  id,
  role: "assistant",
  createdAt: new Date("2026-03-25T10:00:00.000Z"),
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

type RecorderApi = ReturnType<typeof useThreadRecorder>;

const RecorderProbe: FC<{
  onCapture: (api: RecorderApi) => void;
  onUpdate?: (recording: ThreadRecording) => void;
}> = ({ onCapture, onUpdate }) => {
  const recorder = useThreadRecorder({ onUpdate });

  useEffect(() => {
    onCapture(recorder);
  }, [onCapture, recorder]);

  return <div>{recorder.isRecording ? "recording" : "idle"}</div>;
};

describe("useThreadRecorder", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records snapshots and linear message updates", async () => {
    let recorderApi: RecorderApi | undefined;
    const onUpdate = vi.fn();
    const firstMessage = makeMessage("1", "hello");
    const secondMessage = makeMessage("2", "world");

    const { rerender } = render(
      <ReadonlyThreadProvider messages={[firstMessage]}>
        <RecorderProbe
          onCapture={(api) => {
            recorderApi = api;
          }}
          onUpdate={onUpdate}
        />
      </ReadonlyThreadProvider>,
    );

    await waitFor(() => {
      expect(recorderApi).toBeDefined();
    });

    rerender(
      <ReadonlyThreadProvider messages={[firstMessage, secondMessage]}>
        <RecorderProbe
          onCapture={(api) => {
            recorderApi = api;
          }}
          onUpdate={onUpdate}
        />
      </ReadonlyThreadProvider>,
    );

    await waitFor(() => {
      expect(recorderApi!.export().events).toHaveLength(2);
    });

    const events = recorderApi!.export().events;
    expect(events[0]?.type).toBe("snapshot");
    expect(events[1]).toMatchObject({
      type: "message-update",
      messageId: "2",
    });
  });

  it("resets the recording to a fresh snapshot", async () => {
    let recorderApi: RecorderApi | undefined;
    const firstMessage = makeMessage("1", "hello");
    const secondMessage = makeMessage("2", "world");

    const { rerender } = render(
      <ReadonlyThreadProvider messages={[firstMessage]}>
        <RecorderProbe
          onCapture={(api) => {
            recorderApi = api;
          }}
        />
      </ReadonlyThreadProvider>,
    );

    await waitFor(() => {
      expect(recorderApi).toBeDefined();
    });

    rerender(
      <ReadonlyThreadProvider messages={[firstMessage, secondMessage]}>
        <RecorderProbe
          onCapture={(api) => {
            recorderApi = api;
          }}
        />
      </ReadonlyThreadProvider>,
    );

    await waitFor(() => {
      expect(recorderApi!.export().events).toHaveLength(2);
    });

    act(() => {
      recorderApi!.reset();
    });

    expect(recorderApi!.export().events).toHaveLength(1);
    expect(recorderApi!.export().events[0]).toMatchObject({
      type: "snapshot",
    });
    expect(recorderApi!.export().metadata.messageCount).toBe(2);
  });
});
