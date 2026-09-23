import { describe, it, expect, vi } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { RunAggregator } from "./run-aggregator";
import type { AgUiEvent } from "../types";

const createAggregator = () => {
  const emitted: ChatModelRunResult[] = [];
  const logger = { debug: vi.fn(), error: vi.fn() };
  const aggregator = new RunAggregator({
    showThinking: false,
    logger,
    emit: (result) => {
      emitted.push(result);
    },
  });
  aggregator.handle({ type: "RUN_STARTED", runId: "run-1" });
  const dataParts = () =>
    (emitted.at(-1)?.content ?? []).filter((part) => part.type === "data");
  return { aggregator, logger, dataParts };
};

const snapshot = (subagentRunId?: string): AgUiEvent => ({
  type: "ACTIVITY_SNAPSHOT",
  messageId: "act-1",
  activityType: "progress",
  content: { step: 1, label: "loading" },
  ...(subagentRunId ? { subagentRunId } : {}),
});

const delta = (
  patch: unknown[],
  overrides: Partial<Extract<AgUiEvent, { type: "ACTIVITY_DELTA" }>> = {},
): AgUiEvent => ({
  type: "ACTIVITY_DELTA",
  messageId: "act-1",
  activityType: "progress",
  patch,
  ...overrides,
});

describe("RunAggregator ACTIVITY_DELTA", () => {
  it("patches the part its snapshot created", () => {
    const { aggregator, dataParts } = createAggregator();
    aggregator.handle(snapshot());
    aggregator.handle(delta([{ op: "replace", path: "/step", value: 2 }]));
    aggregator.handle(delta([{ op: "add", path: "/done", value: true }]));

    expect(dataParts()).toEqual([
      {
        type: "data",
        name: "agui-activity/progress",
        data: { step: 2, label: "loading", done: true },
      },
    ]);
  });

  it("leaves parts unchanged and logs when no snapshot matches", () => {
    const { aggregator, logger, dataParts } = createAggregator();
    aggregator.handle(snapshot());
    aggregator.handle(
      delta([{ op: "replace", path: "/step", value: 2 }], {
        messageId: "other",
      }),
    );

    expect(dataParts()[0]?.data).toEqual({ step: 1, label: "loading" });
    expect(logger.debug).toHaveBeenCalledWith(
      "[agui] activity delta has no snapshot",
      expect.objectContaining({ messageId: "other" }),
    );
  });

  it("leaves the part unchanged and logs an error on an invalid patch", () => {
    const { aggregator, logger, dataParts } = createAggregator();
    aggregator.handle(snapshot());
    aggregator.handle(
      delta([{ op: "replace", path: "/missing/deep", value: 1 }]),
    );

    expect(dataParts()[0]?.data).toEqual({ step: 1, label: "loading" });
    expect(logger.error).toHaveBeenCalledWith(
      "[agui] failed to apply activity delta",
      expect.anything(),
    );
  });

  it("patches a subagent-scoped part", () => {
    const { aggregator, dataParts } = createAggregator();
    aggregator.handle(snapshot("sub-1"));
    aggregator.handle(
      delta([{ op: "replace", path: "/step", value: 3 }], {
        subagentRunId: "sub-1",
      }),
    );

    expect(dataParts()[0]?.data).toEqual({ step: 3, label: "loading" });
  });
});
