import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "@ai-sdk/react";
import {
  CloudTelemetryReporter,
  type TelemetryFinishEvent,
} from "./CloudTelemetryReporter";

const { reportMock, CloudRunReporterMock } = vi.hoisted(() => {
  const reportMock = vi.fn();
  class CloudRunReporterMock {
    report = reportMock;
  }
  return { reportMock, CloudRunReporterMock };
});

vi.mock("assistant-cloud", async (importOriginal) => ({
  ...(await importOriginal<typeof import("assistant-cloud")>()),
  CloudRunReporter: CloudRunReporterMock,
}));

function assistantMessage(id: string, parts: UIMessage["parts"]): UIMessage {
  return { id, role: "assistant", parts } as UIMessage;
}

function event(
  overrides?: Partial<TelemetryFinishEvent>,
): TelemetryFinishEvent {
  return {
    isAbort: false,
    isDisconnect: false,
    isError: false,
    ...overrides,
  };
}

describe("CloudTelemetryReporter", () => {
  beforeEach(() => {
    reportMock.mockReset();
    reportMock.mockResolvedValue(undefined);
  });

  it("skips a completed tool loop until its continuation", async () => {
    const reporter = new CloudTelemetryReporter({} as never);
    const messages = [
      assistantMessage("assistant-1", [
        { type: "step-start" },
        {
          type: "tool-ask_user_questions",
          toolCallId: "tool-1",
          state: "output-available",
          input: { questions: [] },
          output: { answers: [] },
        } as UIMessage["parts"][number],
      ]),
    ];

    await reporter.reportFromMessages(
      "thread-1",
      messages,
      event({ finishReason: "tool-calls" }),
    );

    expect(reportMock).not.toHaveBeenCalled();

    await reporter.reportFromMessages(
      "thread-1",
      [
        assistantMessage("assistant-1", [
          { type: "step-start" },
          { type: "text", text: "done" },
        ]),
      ],
      event({ finishReason: "stop" }),
    );

    expect(reportMock).toHaveBeenCalledOnce();
  });

  it("writes the finish reason to the extracted final step", async () => {
    const reporter = new CloudTelemetryReporter({} as never);

    await reporter.reportFromMessages(
      "thread-1",
      [
        assistantMessage("assistant-1", [
          { type: "step-start" },
          {
            type: "tool-search",
            toolCallId: "tool-1",
            state: "output-available",
            input: { query: "weather" },
            output: { result: "sunny" },
          } as UIMessage["parts"][number],
          { type: "step-start" },
          { type: "text", text: "Sunny" },
        ]),
      ],
      event({ finishReason: "stop" }),
    );

    const init = reportMock.mock.calls[0]![0]!;
    expect(init.steps.at(-1)?.finishReason).toBe("stop");
  });

  it("keys the run with its thread and assistant message", async () => {
    const reporter = new CloudTelemetryReporter({} as never);

    await reporter.reportFromMessages("thread-1", [
      assistantMessage("assistant-1", [{ type: "text", text: "done" }]),
    ]);

    expect(reportMock).toHaveBeenCalledWith(
      expect.anything(),
      "thread-1:assistant-1",
    );
  });
});
