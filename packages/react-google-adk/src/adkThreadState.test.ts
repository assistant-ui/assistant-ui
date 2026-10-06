import { describe, expect, it } from "vitest";
import { createAdkThreadState, reduceAdkThreadState } from "./adkThreadState";
import type { AdkMessage } from "./types";

const message: AdkMessage = {
  id: "message-1",
  type: "human",
  content: "hello",
};

describe("reduceAdkThreadState", () => {
  it("merges event deltas and metadata with previous state", () => {
    const previous = {
      ...createAdkThreadState(),
      stateDelta: { retained: 1, replaced: "old" },
      artifactDelta: { retained: 2, replaced: 3 },
      messageMetadata: new Map([
        ["retained", { groundingMetadata: "old" }],
        ["replaced", { citationMetadata: "old" }],
      ]),
    };
    const published = {
      ...createAdkThreadState(),
      messages: [message],
      stateDelta: { replaced: "new" },
      artifactDelta: { replaced: 4 },
      agentInfo: { name: "agent" },
      longRunningToolIds: ["tool-1"],
      escalated: true,
      messageMetadata: new Map([["replaced", { citationMetadata: "new" }]]),
    };

    const next = reduceAdkThreadState(previous, {
      type: "event.published",
      state: published,
    });

    expect(next).toMatchObject({
      messages: [message],
      stateDelta: { retained: 1, replaced: "new" },
      artifactDelta: { retained: 2, replaced: 4 },
      agentInfo: { name: "agent" },
      longRunningToolIds: ["tool-1"],
      escalated: true,
    });
    expect([...next.messageMetadata]).toEqual([
      ["retained", { groundingMetadata: "old" }],
      ["replaced", { citationMetadata: "new" }],
    ]);
    expect(previous.stateDelta).toEqual({ retained: 1, replaced: "old" });
    expect(previous.messageMetadata.get("replaced")).toEqual({
      citationMetadata: "old",
    });

    const withoutMetadata = reduceAdkThreadState(next, {
      type: "event.published",
      state: { ...published, messageMetadata: new Map() },
    });
    expect(withoutMetadata.messageMetadata).toBe(next.messageMetadata);
  });

  it("swaps a snapshot and clears omitted fields", () => {
    const previous = {
      ...createAdkThreadState(),
      stateDelta: { stale: true },
      artifactDelta: { stale: 1 },
      longRunningToolIds: ["stale"],
      escalated: true,
    };
    const snapshot = {
      messages: [message],
      stateDelta: { loaded: true },
      messageMetadata: new Map([["message-1", { usageMetadata: 1 }]]),
    };

    const next = reduceAdkThreadState(previous, {
      type: "snapshot.applied",
      snapshot,
    });

    expect(next).toEqual({
      messages: snapshot.messages,
      stateDelta: snapshot.stateDelta,
      agentInfo: {},
      longRunningToolIds: [],
      artifactDelta: {},
      toolConfirmations: [],
      authRequests: [],
      escalated: false,
      messageMetadata: snapshot.messageMetadata,
    });
  });

  it("replaces messages and clears per-turn state while retaining thread deltas", () => {
    const previous = {
      ...createAdkThreadState(),
      stateDelta: { retained: true },
      artifactDelta: { file: 1 },
      agentInfo: { name: "agent" },
      longRunningToolIds: ["tool-1"],
      toolConfirmations: [
        {
          toolCallId: "tool-1",
          toolName: "search",
          args: {},
          hint: "approve",
          confirmed: false,
        },
      ],
      authRequests: [{ toolCallId: "tool-2", authConfig: {} }],
      escalated: true,
      messageMetadata: new Map([["old", { usageMetadata: 1 }]]),
    };

    const next = reduceAdkThreadState(previous, {
      type: "messages.replaced",
      messages: [message],
    });

    expect(next.messages).toEqual([message]);
    expect(next.longRunningToolIds).toEqual([]);
    expect(next.toolConfirmations).toEqual([]);
    expect(next.authRequests).toEqual([]);
    expect(next.escalated).toBe(false);
    expect(next.messageMetadata.size).toBe(0);
    expect(next.stateDelta).toBe(previous.stateDelta);
    expect(next.artifactDelta).toBe(previous.artifactDelta);
    expect(next.agentInfo).toBe(previous.agentInfo);
  });
});
