import { describe, expect, it } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { RunAggregator } from "./run-aggregator";
import { fromAgUiMessages, toAgUiMessages } from "./conversions";
import { parseAgUiEvent } from "../event-parser";

describe("AG-UI tool result metadata", () => {
  it("keeps interleaved tool result metadata through finish and message export/import", () => {
    const expectedSecondMetadata = {
      trace: "second-final",
      attempts: 0,
      optional: null,
      nested: { value: "after" },
    };
    const updates: ChatModelRunResult[] = [];
    const aggregator = new RunAggregator({
      showThinking: false,
      logger: { debug: () => {}, error: () => {} },
      emit: (update) => updates.push(update),
    });
    aggregator.handle({ type: "RUN_STARTED", runId: "run" });
    for (const toolCallId of ["first", "second", "empty"]) {
      aggregator.handle({
        type: "TOOL_CALL_START",
        toolCallId,
        toolCallName: "lookup",
      });
    }

    for (const event of [
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "second",
        messageId: "result-second",
        content: "0",
        metadata: {
          trace: "second",
          attempts: 0,
          optional: null,
          nested: { old: true, value: "before" },
        },
      },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "first",
        messageId: "result-first",
        content: "false",
        metadata: { trace: "first", labels: [] },
      },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "empty",
        messageId: "result-empty",
        content: "",
        metadata: { trace: "empty" },
      },
      {
        type: "TOOL_CALL_RESULT",
        toolCallId: "second",
        messageId: "result-second",
        content: "0",
        metadata: { trace: "second-final", nested: { value: "after" } },
      },
    ]) {
      const parsed = parseAgUiEvent(event);
      if (!parsed) throw new Error("Expected a parsed result event");
      aggregator.handle(parsed);
    }

    const liveSecond = updates
      .at(-1)
      ?.content?.find(
        (part) => part.type === "tool-call" && part.toolCallId === "second",
      );
    if (liveSecond?.type !== "tool-call") {
      throw new Error("Expected the streamed second tool call");
    }
    expect(liveSecond).toMatchObject({ result: 0 });
    expect(liveSecond.providerMetadata).toEqual({
      agui: { messageMetadata: expectedSecondMetadata },
    });
    aggregator.handle({ type: "RUN_FINISHED", runId: "run" });
    const content = updates.at(-1)?.content;
    expect(content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolCallId: "first",
          result: false,
          providerMetadata: {
            agui: { messageMetadata: { trace: "first", labels: [] } },
          },
        }),
        expect.objectContaining({
          toolCallId: "second",
          result: 0,
          providerMetadata: {
            agui: {
              messageMetadata: expectedSecondMetadata,
            },
          },
        }),
        expect.objectContaining({
          toolCallId: "empty",
          result: "",
          providerMetadata: {
            agui: { messageMetadata: { trace: "empty" } },
          },
        }),
      ]),
    );
    const exported = toAgUiMessages([
      { id: "assistant", role: "assistant", content: content ?? [] },
    ]);
    expect(exported).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          toolCallId: "first",
          metadata: { trace: "first", labels: [] },
        }),
        expect.objectContaining({
          role: "tool",
          toolCallId: "second",
          metadata: expectedSecondMetadata,
        }),
        expect.objectContaining({
          role: "tool",
          toolCallId: "empty",
          metadata: { trace: "empty" },
        }),
      ]),
    );
    expect(fromAgUiMessages(exported)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              toolCallId: "second",
              result: 0,
              providerMetadata: {
                agui: {
                  messageMetadata: expectedSecondMetadata,
                },
              },
            }),
          ]),
        }),
      ]),
    );
  });
});
