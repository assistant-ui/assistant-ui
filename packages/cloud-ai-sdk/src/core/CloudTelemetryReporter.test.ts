import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "@ai-sdk/react";
import { CloudTelemetryReporter } from "./CloudTelemetryReporter";
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
});
