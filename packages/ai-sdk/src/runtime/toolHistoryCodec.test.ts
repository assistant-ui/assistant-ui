import type {
  RespondToToolApprovalOptions,
  ThreadMessage,
  Unstable_ToolInteractionLog,
} from "@assistant-ui/core";
import { describe, expect, it } from "vitest";
import {
  addToolData,
  collectToolApprovalResponses,
  collectToolArtifacts,
  collectToolInteractions,
  restoreToolData,
} from "./toolHistoryCodec";

describe("tool history codec", () => {
  it("round trips artifacts, interactions, and approval responses", () => {
    const log: Unstable_ToolInteractionLog = {
      entries: [{ type: "action", occurredAt: 1, payload: { refresh: true } }],
    };
    const response: RespondToToolApprovalOptions = {
      approvalId: "approval-1",
      approved: true,
      answers: { scope: { optionIds: ["tests"] } },
      reason: "Approved",
    };
    const threadMessage: ThreadMessage = {
      id: "assistant-1",
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "weather",
          args: {},
          argsText: "{}",
          result: undefined,
          isError: false,
          approval: { id: "approval-1" },
        },
      ],
      createdAt: new Date(),
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    const innerMessage = {
      id: "inner-1",
      parts: [{ toolCallId: "call-1", approval: { id: "approval-1" } }],
      metadata: { custom: "kept" },
    };
    const artifacts = new Map<string, unknown>([
      ["call-1", { preview: "sunny" }],
      ["unrelated", "ignored"],
    ]);
    const interactions = new Map<string, Unstable_ToolInteractionLog>([
      ["call-1", log],
      ["unrelated", log],
    ]);
    const responses = new Map<string, RespondToToolApprovalOptions>([
      ["approval-1", response],
      ["unrelated", response],
    ]);

    const encoded = addToolData(
      innerMessage,
      collectToolArtifacts(threadMessage, artifacts),
      collectToolInteractions(threadMessage, interactions),
      collectToolApprovalResponses(threadMessage, responses),
    );

    expect(encoded).toEqual({
      ...innerMessage,
      metadata: {
        custom: "kept",
        __aui_toolArtifacts: { "call-1": { preview: "sunny" } },
        __aui_toolInteractions: { "call-1": log },
        __aui_toolApprovalResponses: {
          "approval-1": {
            approved: true,
            answers: response.answers,
            reason: "Approved",
          },
        },
      },
    });
    expect(innerMessage.metadata).toEqual({ custom: "kept" });

    const restoredArtifacts = new Map<string, unknown>();
    const restoredInteractions = new Map<string, Unstable_ToolInteractionLog>();
    const restoredResponses = new Map<string, RespondToToolApprovalOptions>();
    expect(
      restoreToolData(
        encoded,
        restoredArtifacts,
        restoredInteractions,
        restoredResponses,
      ),
    ).toEqual(innerMessage);
    expect(restoredArtifacts).toEqual(
      new Map([["call-1", { preview: "sunny" }]]),
    );
    expect(restoredInteractions).toEqual(new Map([["call-1", log]]));
    expect(restoredResponses).toEqual(new Map([["approval-1", response]]));
  });

  it("leaves messages without tool metadata unchanged", () => {
    const message = {
      parts: [{ toolCallId: "call-1" }],
      metadata: { custom: 1 },
    };
    expect(addToolData(message, undefined, undefined, undefined)).toBe(message);
    expect(restoreToolData(message, new Map(), new Map(), new Map())).toBe(
      message,
    );
    expect(
      restoreToolData({ parts: [] }, new Map(), new Map(), new Map()),
    ).toEqual({ parts: [] });
  });

  it("ignores non-object messages and malformed metadata values", () => {
    expect(
      addToolData(null, { "call-1": "artifact" }, undefined, undefined),
    ).toBeNull();
    const invalidParts = { parts: "invalid" };
    expect(
      addToolData(invalidParts, { "call-1": "artifact" }, undefined, undefined),
    ).toBe(invalidParts);
    expect(restoreToolData(42, new Map(), new Map(), new Map())).toBe(42);
    const invalidMetadata = { parts: [], metadata: "invalid" };
    expect(
      restoreToolData(invalidMetadata, new Map(), new Map(), new Map()),
    ).toBe(invalidMetadata);

    const artifacts = new Map<string, unknown>();
    const interactions = new Map<string, Unstable_ToolInteractionLog>();
    const responses = new Map<string, RespondToToolApprovalOptions>();
    expect(
      restoreToolData(
        {
          metadata: {
            custom: "kept",
            __aui_toolArtifacts: "invalid",
            __aui_toolInteractions: 1,
            __aui_toolApprovalResponses: [],
          },
        },
        artifacts,
        interactions,
        responses,
      ),
    ).toEqual({ metadata: { custom: "kept" } });
    expect(artifacts.size).toBe(0);
    expect(interactions.size).toBe(0);
    expect(responses.size).toBe(0);
  });
});
