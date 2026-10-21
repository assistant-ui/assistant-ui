import { describe, expect, it } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { RunAggregator } from "./run-aggregator";
import type { AgUiCustomMetadata } from "../types";
import { toAgUiMessages } from "./conversions";

describe.each([true, false])(
  "reasoning ownership (showThinking=%s)",
  (showThinking) => {
    it.each([
      { parentText: "", nextReasoning: false },
      { parentText: "", nextReasoning: true },
      { parentText: "Looking it up.", nextReasoning: false },
      { parentText: "Looking it up.", nextReasoning: true },
    ])(
      "keeps pre-tool reasoning on its parent ($parentText, nextReasoning=$nextReasoning)",
      ({ parentText, nextReasoning }) => {
        let latest: ChatModelRunResult = {};
        let previous: ChatModelRunResult | undefined;
        const aggregator = new RunAggregator({
          showThinking,
          logger: { debug: () => {}, error: () => {} },
          emit: (update) => {
            latest = update;
          },
          onTextMessageStart: () => {
            previous = latest;
          },
        });
        const reason = (messageId: string, delta: string) => {
          aggregator.handle({ type: "REASONING_MESSAGE_START", messageId });
          aggregator.handle({
            type: "REASONING_MESSAGE_CONTENT",
            messageId,
            delta,
          });
          aggregator.handle({ type: "REASONING_MESSAGE_END", messageId });
          aggregator.handle({
            type: "REASONING_ENCRYPTED_VALUE",
            subtype: "message",
            entityId: messageId,
            encryptedValue: `sig-${messageId}`,
          });
        };
        const reasoningOf = (result: ChatModelRunResult | undefined) =>
          result?.content?.flatMap((part) =>
            part.type === "reasoning" ? [part.text] : [],
          );
        const opaqueOf = (result: ChatModelRunResult | undefined) =>
          (result?.metadata?.custom?.agui as AgUiCustomMetadata | undefined)
            ?.opaqueReasoning ?? [];

        aggregator.handle({ type: "RUN_STARTED", runId: "run-1" });
        aggregator.handle({
          type: "TEXT_MESSAGE_START",
          messageId: "assistant-1",
        });
        if (parentText)
          aggregator.handle({
            type: "TEXT_MESSAGE_CONTENT",
            messageId: "assistant-1",
            delta: parentText,
          });
        reason("r-1", "plan the call");
        aggregator.handle({
          type: "TOOL_CALL_START",
          toolCallId: "call-1",
          toolCallName: "lookup",
          parentMessageId: "assistant-1",
        });
        aggregator.handle({ type: "TOOL_CALL_END", toolCallId: "call-1" });
        aggregator.handle({
          type: "TOOL_CALL_RESULT",
          toolCallId: "call-1",
          messageId: "tool-1",
          content: "ok",
        });
        if (nextReasoning) reason("r-2", "write the answer");
        aggregator.handle({
          type: "TEXT_MESSAGE_START",
          messageId: "assistant-2",
        });
        aggregator.handle({
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "assistant-2",
          delta: "Done.",
        });
        aggregator.handle({ type: "RUN_FINISHED", runId: "run-1" });

        expect(
          previous?.content?.filter((part) => part.type === "tool-call"),
        ).toHaveLength(1);
        expect(
          latest.content?.filter((part) => part.type === "tool-call"),
        ).toHaveLength(0);
        if (showThinking) {
          expect(reasoningOf(previous)).toEqual(["plan the call"]);
          expect(reasoningOf(latest)).toEqual(
            nextReasoning ? ["write the answer"] : [],
          );
        } else {
          expect(opaqueOf(previous)).toEqual([
            { id: "r-1", encryptedValue: "sig-r-1" },
          ]);
          expect(opaqueOf(latest)).toEqual(
            nextReasoning ? [{ id: "r-2", encryptedValue: "sig-r-2" }] : [],
          );
        }
        const exported = toAgUiMessages([
          {
            id: "assistant-1",
            role: "assistant",
            content: previous?.content ?? [],
            metadata: previous?.metadata,
          },
          {
            id: "assistant-2",
            role: "assistant",
            content: latest.content ?? [],
            metadata: latest.metadata,
          },
        ]);
        expect(exported.map((message) => message.id)).toEqual([
          "r-1",
          "assistant-1",
          "tool-1",
          ...(nextReasoning ? ["r-2"] : []),
          "assistant-2",
        ]);
        expect(
          exported.flatMap((message) =>
            message.role === "reasoning"
              ? [[message.id, message.encryptedValue]]
              : [],
          ),
        ).toEqual([
          ["r-1", "sig-r-1"],
          ...(nextReasoning ? [["r-2", "sig-r-2"]] : []),
        ]);
      },
    );
  },
);
