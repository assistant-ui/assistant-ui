"use client";

import { describe, it, expect, vi } from "vitest";
import { parseAgUiEvent } from "../src/runtime/event-parser";
import { readRawResponseSchema } from "../src/runtime/interrupt-internals";

describe("parseAgUiEvent", () => {
  it("parses text content event", () => {
    const event = parseAgUiEvent({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hi",
    });
    expect(event).toEqual({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hi",
    });
  });

  it("parses a reasoning encrypted value event", () => {
    expect(
      parseAgUiEvent({
        type: "REASONING_ENCRYPTED_VALUE",
        subtype: "message",
        entityId: "r-1",
        encryptedValue: "signed-blob",
      }),
    ).toEqual({
      type: "REASONING_ENCRYPTED_VALUE",
      subtype: "message",
      entityId: "r-1",
      encryptedValue: "signed-blob",
    });
  });

  it("parses a reasoning encrypted value event's subagentRunId", () => {
    expect(
      parseAgUiEvent({
        type: "REASONING_ENCRYPTED_VALUE",
        subtype: "message",
        entityId: "r-1",
        encryptedValue: "signed-blob",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "REASONING_ENCRYPTED_VALUE",
      subtype: "message",
      entityId: "r-1",
      encryptedValue: "signed-blob",
      subagentRunId: "sub-1",
    });
  });

  it("rejects a reasoning encrypted value event with an unusable discriminator", () => {
    for (const subtype of [undefined, "", "Message", "other"]) {
      expect(
        parseAgUiEvent({
          type: "REASONING_ENCRYPTED_VALUE",
          ...(subtype !== undefined ? { subtype } : {}),
          entityId: "r-1",
          encryptedValue: "signed-blob",
        }),
      ).toBeNull();
    }
  });

  it("guards against invalid events", () => {
    const event = parseAgUiEvent({ type: "TEXT_MESSAGE_CONTENT", delta: "" });
    expect(event).toBeNull();
  });

  it("rejects malformed message snapshots without rejecting empty snapshots", () => {
    const debug = vi.fn();
    expect(
      parseAgUiEvent(
        { type: "MESSAGES_SNAPSHOT", messages: {} },
        { logger: { debug } as any },
      ),
    ).toBeNull();
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug).toHaveBeenCalledWith(
      expect.stringMatching(/MESSAGES_SNAPSHOT missing messages/),
      { type: "MESSAGES_SNAPSHOT", messages: {} },
    );
    expect(parseAgUiEvent({ type: "MESSAGES_SNAPSHOT" })).toBeNull();
    expect(parseAgUiEvent({ type: "MESSAGES_SNAPSHOT", messages: [] })).toEqual(
      { type: "MESSAGES_SNAPSHOT", messages: [] },
    );
  });

  it("parses reasoning content with optional message id", () => {
    const event = parseAgUiEvent({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m-reason",
      delta: "chain of thought",
    });
    expect(event).toEqual({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m-reason",
      delta: "chain of thought",
    });
  });

  it("falls back to RAW for unknown types", () => {
    const event = parseAgUiEvent({ type: "UNKNOWN_EVENT", foo: "bar" });
    expect(event).toEqual({
      type: "RAW",
      event: { type: "UNKNOWN_EVENT", foo: "bar" },
      source: "UNKNOWN_EVENT",
    });
  });

  it("parses ACTIVITY_SNAPSHOT events", () => {
    const event = parseAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "m1",
      activityType: "mcp-apps",
      content: {
        resourceUri: "ui://srv/mcp-app.html",
        toolInput: { city: "sf" },
      },
      replace: true,
    });
    expect(event).toEqual({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "m1",
      activityType: "mcp-apps",
      content: {
        resourceUri: "ui://srv/mcp-app.html",
        toolInput: { city: "sf" },
      },
      replace: true,
    });
  });

  it("guards against ACTIVITY_SNAPSHOT missing activityType or content", () => {
    expect(
      parseAgUiEvent({ type: "ACTIVITY_SNAPSHOT", content: {} }),
    ).toBeNull();
    expect(
      parseAgUiEvent({ type: "ACTIVITY_SNAPSHOT", activityType: "mcp-apps" }),
    ).toBeNull();
  });

  it("omits non-string messageId from ACTIVITY_SNAPSHOT", () => {
    const event = parseAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      messageId: 42,
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    });
    expect(event).toEqual({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    });
  });

  it("omits non-boolean replace from ACTIVITY_SNAPSHOT", () => {
    const event = parseAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
      replace: "yes",
    });
    expect(event).toEqual({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    });
  });

  it("parses ACTIVITY_SNAPSHOT without messageId or replace", () => {
    const event = parseAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    });
    expect(event).toEqual({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://srv/mcp-app.html" },
    });
  });

  it("passes RUN_FINISHED through with no outcome (legacy)", () => {
    const event = parseAgUiEvent({ type: "RUN_FINISHED", runId: "r1" });
    expect(event).toEqual({ type: "RUN_FINISHED", runId: "r1" });
  });

  it("parses RUN_FINISHED success outcome", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
    });
    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
    });
  });

  it("parses RUN_FINISHED interrupt outcome with interrupts", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: "int-1",
            reason: "tool_call",
            message: "approve?",
            toolCallId: "call-1",
            responseSchema: { type: "object" },
            metadata: { foo: "bar" },
          },
        ],
      },
    });
    expect(event).toMatchObject({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: "int-1",
            reason: "tool_call",
            message: "approve?",
            toolCallId: "call-1",
            responseSchema: { type: "object" },
            metadata: { foo: "bar" },
          },
        ],
      },
    });
  });

  it("carries a non-object responseSchema on the internal carrier instead of normalizing it to absent", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [
          { id: "int-1", reason: "tool_call", responseSchema: false },
        ],
      },
    });
    const [interrupt] = (event as any).outcome.interrupts;
    expect(interrupt).toMatchObject({ id: "int-1", reason: "tool_call" });
    expect(readRawResponseSchema(interrupt)).toBe(false);
    expect(interrupt.responseSchema).toBeUndefined();
  });

  it("drops malformed interrupt outcomes (no interrupts)", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "interrupt", interrupts: [] },
    });
    expect(event).toEqual({ type: "RUN_FINISHED", runId: "r1" });
  });

  it("logs a debug entry when interrupt outcome falls back silently", () => {
    const debug = vi.fn();
    parseAgUiEvent(
      {
        type: "RUN_FINISHED",
        runId: "r1",
        outcome: {
          type: "interrupt",
          interrupts: [{ id: "" }, { reason: "" }],
        },
      },
      { logger: { debug } as any },
    );
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug.mock.calls[0][0]).toMatch(/no valid interrupts/);
  });

  it("parses subagentRunId on TEXT_MESSAGE_START/CONTENT/END", () => {
    expect(
      parseAgUiEvent({
        type: "TEXT_MESSAGE_START",
        messageId: "m1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TEXT_MESSAGE_START",
      messageId: "m1",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "m1",
        delta: "hi",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hi",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "TEXT_MESSAGE_END",
        messageId: "m1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TEXT_MESSAGE_END",
      messageId: "m1",
      subagentRunId: "sub-1",
    });
  });

  it("parses subagentRunId on the chunk variants and ACTIVITY_SNAPSHOT", () => {
    expect(
      parseAgUiEvent({
        type: "TEXT_MESSAGE_CHUNK",
        messageId: "m1",
        delta: "hi",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TEXT_MESSAGE_CHUNK",
      messageId: "m1",
      delta: "hi",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "TOOL_CALL_CHUNK",
        toolCallId: "t1",
        delta: "{}",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TOOL_CALL_CHUNK",
      toolCallId: "t1",
      delta: "{}",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "ACTIVITY_SNAPSHOT",
        activityType: "mcp-apps",
        content: { resourceUri: "ui://s/a.html" },
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "mcp-apps",
      content: { resourceUri: "ui://s/a.html" },
      subagentRunId: "sub-1",
    });
  });

  it("parses SUBAGENT_FINISHED result alongside its outcome", () => {
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_FINISHED",
        subagentRunId: "sub-1",
        result: { summary: "done" },
        outcome: { type: "suspended", interruptIds: ["int-1"] },
      }),
    ).toEqual({
      type: "SUBAGENT_FINISHED",
      subagentRunId: "sub-1",
      result: { summary: "done" },
      outcome: { type: "suspended", interruptIds: ["int-1"] },
    });
  });

  it("parses subagentRunId on TOOL_CALL_START/ARGS/END/RESULT", () => {
    expect(
      parseAgUiEvent({
        type: "TOOL_CALL_START",
        toolCallId: "t1",
        toolCallName: "explore",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TOOL_CALL_START",
      toolCallId: "t1",
      toolCallName: "explore",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "TOOL_CALL_ARGS",
        toolCallId: "t1",
        delta: "{}",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TOOL_CALL_ARGS",
      toolCallId: "t1",
      delta: "{}",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "TOOL_CALL_END",
        toolCallId: "t1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TOOL_CALL_END",
      toolCallId: "t1",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "TOOL_CALL_RESULT",
        toolCallId: "t1",
        content: "ok",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "TOOL_CALL_RESULT",
      toolCallId: "t1",
      content: "ok",
      subagentRunId: "sub-1",
    });
  });

  it("parses subagentRunId on REASONING_START/MESSAGE_START/MESSAGE_CONTENT/MESSAGE_END/END", () => {
    expect(
      parseAgUiEvent({
        type: "REASONING_START",
        messageId: "r1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "REASONING_START",
      messageId: "r1",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "REASONING_MESSAGE_START",
        messageId: "r1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "REASONING_MESSAGE_START",
      messageId: "r1",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "REASONING_MESSAGE_CONTENT",
        messageId: "r1",
        delta: "thinking",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "r1",
      delta: "thinking",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "REASONING_MESSAGE_END",
        messageId: "r1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "REASONING_MESSAGE_END",
      messageId: "r1",
      subagentRunId: "sub-1",
    });
    expect(
      parseAgUiEvent({
        type: "REASONING_END",
        messageId: "r1",
        subagentRunId: "sub-1",
      }),
    ).toEqual({
      type: "REASONING_END",
      messageId: "r1",
      subagentRunId: "sub-1",
    });
  });

  it("parses SUBAGENT_STARTED", () => {
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_STARTED",
        subagentRunId: "sub-1",
        name: "investigate",
        description: "digs into the incident",
        parentToolCallId: "t1",
        parentMessageId: "m1",
      }),
    ).toEqual({
      type: "SUBAGENT_STARTED",
      subagentRunId: "sub-1",
      name: "investigate",
      description: "digs into the incident",
      parentToolCallId: "t1",
      parentMessageId: "m1",
    });
  });

  it("SUBAGENT_STARTED requires subagentRunId and name", () => {
    expect(parseAgUiEvent({ type: "SUBAGENT_STARTED", name: "x" })).toBeNull();
    expect(
      parseAgUiEvent({ type: "SUBAGENT_STARTED", subagentRunId: "sub-1" }),
    ).toBeNull();
  });

  it("parses SUBAGENT_FINISHED with success and suspended outcomes", () => {
    expect(
      parseAgUiEvent({ type: "SUBAGENT_FINISHED", subagentRunId: "sub-1" }),
    ).toEqual({ type: "SUBAGENT_FINISHED", subagentRunId: "sub-1" });
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_FINISHED",
        subagentRunId: "sub-1",
        outcome: { type: "success" },
      }),
    ).toEqual({
      type: "SUBAGENT_FINISHED",
      subagentRunId: "sub-1",
      outcome: { type: "success" },
    });
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_FINISHED",
        subagentRunId: "sub-1",
        outcome: { type: "suspended", interruptIds: ["i1"] },
      }),
    ).toEqual({
      type: "SUBAGENT_FINISHED",
      subagentRunId: "sub-1",
      outcome: { type: "suspended", interruptIds: ["i1"] },
    });
  });

  it("requires subagentRunId for SUBAGENT_FINISHED", () => {
    expect(parseAgUiEvent({ type: "SUBAGENT_FINISHED" })).toBeNull();
  });

  it("drops a malformed SUBAGENT_FINISHED outcome and filters non-string interruptIds", () => {
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_FINISHED",
        subagentRunId: "sub-1",
        outcome: { type: "bogus" },
      }),
    ).toEqual({ type: "SUBAGENT_FINISHED", subagentRunId: "sub-1" });
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_FINISHED",
        subagentRunId: "sub-1",
        outcome: { type: "suspended", interruptIds: ["i1", 42, null] },
      }),
    ).toEqual({
      type: "SUBAGENT_FINISHED",
      subagentRunId: "sub-1",
      outcome: { type: "suspended", interruptIds: ["i1"] },
    });
  });

  it("parses SUBAGENT_ERROR", () => {
    expect(
      parseAgUiEvent({
        type: "SUBAGENT_ERROR",
        subagentRunId: "sub-1",
        message: "boom",
        code: "E1",
      }),
    ).toEqual({
      type: "SUBAGENT_ERROR",
      subagentRunId: "sub-1",
      message: "boom",
      code: "E1",
    });
    expect(
      parseAgUiEvent({ type: "SUBAGENT_ERROR", message: "boom" }),
    ).toBeNull();
    expect(
      parseAgUiEvent({ type: "SUBAGENT_ERROR", subagentRunId: "sub-1" }),
    ).toBeNull();
  });
});
