"use client";

import { describe, it, expect } from "vitest";
import { createAgUiResumeStream } from "../src/runtime/adapter/resume-stream";
import type { AgUiEvent } from "../src/runtime/types";
import type { ChatModelRunResult } from "@assistant-ui/core";

async function* fromArray(events: AgUiEvent[]): AsyncGenerator<AgUiEvent> {
  for (const event of events) yield event;
}

async function collect(
  stream: AsyncGenerator<ChatModelRunResult, void, unknown>,
): Promise<ChatModelRunResult[]> {
  const results: ChatModelRunResult[] = [];
  for await (const result of stream) results.push(result);
  return results;
}

describe("createAgUiResumeStream", () => {
  it("replays text events into run-result snapshots", async () => {
    const results = await collect(
      createAgUiResumeStream(
        fromArray([
          { type: "RUN_STARTED", runId: "run" },
          { type: "TEXT_MESSAGE_START", messageId: "m1" },
          { type: "TEXT_MESSAGE_CONTENT", messageId: "m1", delta: "Hello" },
          { type: "TEXT_MESSAGE_CONTENT", messageId: "m1", delta: " world" },
          { type: "TEXT_MESSAGE_END", messageId: "m1" },
          { type: "RUN_FINISHED", runId: "run" },
        ]),
      ),
    );

    const last = results.at(-1);
    expect(last?.content).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("folds STATE_SNAPSHOT and STATE_DELTA into metadata.unstable_state", async () => {
    const results = await collect(
      createAgUiResumeStream(
        fromArray([
          { type: "STATE_SNAPSHOT", snapshot: { count: 1 } },
          { type: "STATE_DELTA", delta: [{ op: "replace", path: "/count", value: 2 }] },
        ]),
      ),
    );

    expect(results.map((r) => r.metadata?.unstable_state)).toEqual([
      { count: 1 },
      { count: 2 },
    ]);
  });

  it("ignores MESSAGES_SNAPSHOT (history is hydrated on load)", async () => {
    const results = await collect(
      createAgUiResumeStream(
        fromArray([{ type: "MESSAGES_SNAPSHOT", messages: [{ id: "x" }] }]),
      ),
    );

    expect(results).toEqual([]);
  });
});
