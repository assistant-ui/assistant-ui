import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "@ai-sdk/react";
import {
  CloudTelemetryReporter,
  type TelemetryFinishEvent,
} from "./CloudTelemetryReporter";
import type { AssistantCloud } from "assistant-cloud";

function assistantMsg(
  id: string,
  text: string,
  metadata?: Record<string, unknown>,
): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text }],
    ...(metadata ? { metadata } : undefined),
  } as UIMessage;
}

function assistantMsgWithParts(
  id: string,
  parts: UIMessage["parts"],
): UIMessage {
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

function createCloud(overrides?: {
  enabled?: boolean;
  beforeReport?: (report: any) => any;
}) {
  const reportMock = vi.fn().mockResolvedValue({ run_id: "run-1" });
  const cloud = {
    telemetry: {
      enabled: overrides?.enabled ?? true,
      ...(overrides?.beforeReport
        ? { beforeReport: overrides.beforeReport }
        : undefined),
    },
    runs: { report: reportMock },
  } as unknown as AssistantCloud;
  return { cloud, reportMock };
}

describe("CloudTelemetryReporter", () => {
  it("does not report when telemetry is disabled", async () => {
    const { cloud, reportMock } = createCloud({ enabled: false });
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages("thread-1", [
      assistantMsg("m-1", "hello"),
    ]);

    expect(reportMock).not.toHaveBeenCalled();
  });

  it("reports with correct payload when enabled", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages("thread-1", [
      assistantMsg("m-1", "hello", {
        modelId: "gpt-4o",
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          reasoningTokens: 20,
          cachedInputTokens: 10,
        },
      }),
    ]);

    expect(reportMock).toHaveBeenCalledOnce();
    expect(reportMock).toHaveBeenCalledWith({
      thread_id: "thread-1",
      status: "completed",
      model_id: "gpt-4o",
      input_tokens: 100,
      output_tokens: 50,
      reasoning_tokens: 20,
      cached_input_tokens: 10,
      output_text: "hello",
    });
  });

  it("applies beforeReport mutation", async () => {
    const { cloud, reportMock } = createCloud({
      beforeReport: (report) => ({
        ...report,
        metadata: { env: "test" },
      }),
    });
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages("thread-1", [assistantMsg("m-1", "hi")]);

    expect(reportMock).toHaveBeenCalledOnce();
    const payload = reportMock.mock.calls[0]![0]!;
    expect(payload.metadata).toEqual({ env: "test" });
  });

  it("skips report when beforeReport returns null", async () => {
    const { cloud, reportMock } = createCloud({
      beforeReport: () => null,
    });
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages("thread-1", [assistantMsg("m-1", "hi")]);

    expect(reportMock).not.toHaveBeenCalled();
  });

  it("does not throw when runs.report rejects", async () => {
    const { cloud, reportMock } = createCloud();
    reportMock.mockRejectedValue(new Error("network error"));
    const reporter = new CloudTelemetryReporter(cloud);

    await expect(
      reporter.reportFromMessages("thread-1", [assistantMsg("m-1", "hi")]),
    ).resolves.toBeUndefined();
  });

  it("deduplicates reports for the same thread+message", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);
    const messages = [assistantMsg("m-1", "hi")];

    await reporter.reportFromMessages("thread-1", messages);
    await reporter.reportFromMessages("thread-1", messages);

    expect(reportMock).toHaveBeenCalledOnce();
  });

  it("reports separately for different message ids", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages("thread-1", [
      assistantMsg("m-1", "first"),
    ]);
    await reporter.reportFromMessages("thread-1", [
      assistantMsg("m-2", "second"),
    ]);

    expect(reportMock).toHaveBeenCalledTimes(2);
  });

  it("uses finishReason='stop' as the authoritative completed signal", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);
    const messages = [assistantMsg("m-1", "hi")];

    await reporter.reportFromMessages(
      "thread-1",
      messages,
      event({ finishReason: "stop" }),
    );

    expect(reportMock).toHaveBeenCalledOnce();
    expect(reportMock.mock.calls[0]![0]!.status).toBe("completed");
  });

  it("maps finishReason='length' / 'content-filter' to incomplete", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages(
      "thread-1",
      [assistantMsg("m-1", "truncated...")],
      event({ finishReason: "length" }),
    );
    expect(reportMock.mock.calls[0]![0]!.status).toBe("incomplete");

    await reporter.reportFromMessages(
      "thread-2",
      [assistantMsg("m-2", "blocked")],
      event({
        finishReason: "content-filter",
      }),
    );
    expect(reportMock.mock.calls[1]![0]!.status).toBe("incomplete");
  });

  it("maps isError to error status", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);
    const messages = [assistantMsg("m-1", "partial")];

    await reporter.reportFromMessages(
      "thread-1",
      messages,
      event({ isError: true }),
    );

    expect(reportMock.mock.calls[0]![0]!.status).toBe("error");
  });

  it("maps finishReason='error' (without isError) to error status", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);
    const messages = [assistantMsg("m-1", "partial")];

    await reporter.reportFromMessages(
      "thread-1",
      messages,
      event({ finishReason: "error" }),
    );

    expect(reportMock.mock.calls[0]![0]!.status).toBe("error");
  });

  it("maps isAbort / isDisconnect to incomplete", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages(
      "thread-1",
      [assistantMsg("m-1", "aborted")],
      event({ isAbort: true }),
    );
    expect(reportMock.mock.calls[0]![0]!.status).toBe("incomplete");

    await reporter.reportFromMessages(
      "thread-2",
      [assistantMsg("m-2", "disconnected")],
      event({ isDisconnect: true }),
    );
    expect(reportMock.mock.calls[1]![0]!.status).toBe("incomplete");
  });

  it("skips mid-loop reports when finishReason='tool-calls' and tools are resolved", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);
    const messages = [
      assistantMsgWithParts("m-1", [
        { type: "step-start" },
        {
          type: "tool-ask_user_questions",
          toolCallId: "tc-1",
          state: "output-available",
          input: { questions: [] },
          output: { answers: [] },
        } as unknown as UIMessage["parts"][number],
      ]),
    ];

    await reporter.reportFromMessages(
      "thread-1",
      messages,
      event({ finishReason: "tool-calls" }),
    );

    expect(reportMock).not.toHaveBeenCalled();

    const continuation = [
      assistantMsgWithParts("m-1", [
        { type: "step-start" },
        {
          type: "tool-ask_user_questions",
          toolCallId: "tc-1",
          state: "output-available",
          input: { questions: [] },
          output: { answers: [] },
        } as unknown as UIMessage["parts"][number],
        { type: "step-start" },
        { type: "text", text: "thanks for the answers" },
      ]),
    ];

    await reporter.reportFromMessages(
      "thread-1",
      continuation,
      event({ finishReason: "stop" }),
    );

    expect(reportMock).toHaveBeenCalledOnce();
    const payload = reportMock.mock.calls[0]![0]!;
    expect(payload.status).toBe("completed");
    expect(payload.output_text).toBe("thanks for the answers");
  });

  it("reports finishReason='tool-calls' when tools are not all resolved (terminal)", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);
    const messages = [
      assistantMsgWithParts("m-1", [
        { type: "step-start" },
        {
          type: "tool-search",
          toolCallId: "tc-1",
          state: "input-available",
          input: { query: "x" },
        } as unknown as UIMessage["parts"][number],
      ]),
    ];

    await reporter.reportFromMessages(
      "thread-1",
      messages,
      event({ finishReason: "tool-calls" }),
    );

    expect(reportMock).toHaveBeenCalledOnce();
    expect(reportMock.mock.calls[0]![0]!.status).toBe("completed");
  });

  it("falls back to the message-shape heuristic when no event is provided", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);

    await reporter.reportFromMessages("thread-1", [
      assistantMsgWithParts("m-1", [{ type: "step-start" }]),
    ]);

    expect(reportMock).toHaveBeenCalledOnce();
    expect(reportMock.mock.calls[0]![0]!.status).toBe("incomplete");
  });

  it("passes sampling_calls through to the report", async () => {
    const { cloud, reportMock } = createCloud();
    const reporter = new CloudTelemetryReporter(cloud);

    const messages: UIMessage[] = [
      {
        id: "m-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "delegate",
            toolCallId: "tc-1",
            state: "output-available",
            input: { task: "summarize" },
            output: { result: "done" },
          } as unknown as UIMessage["parts"][number],
          { type: "text", text: "result" },
        ],
        metadata: {
          samplingCalls: {
            "tc-1": [
              {
                model_id: "gemini-2.5-flash",
                input_tokens: 100,
                output_tokens: 50,
              },
            ],
          },
        },
      } as UIMessage,
    ];

    await reporter.reportFromMessages("thread-1", messages);

    expect(reportMock).toHaveBeenCalledOnce();
    const payload = reportMock.mock.calls[0]![0]!;
    expect(payload.tool_calls).toHaveLength(1);
    expect(payload.tool_calls[0].sampling_calls).toEqual([
      { model_id: "gemini-2.5-flash", input_tokens: 100, output_tokens: 50 },
    ]);
  });
});
