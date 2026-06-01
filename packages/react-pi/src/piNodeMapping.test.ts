import { describe, expect, it } from "vitest";
import type {
  AgentSessionEvent,
  SessionInfo,
} from "@earendil-works/pi-coding-agent";
import {
  deriveReadiness,
  mapSessionEvent,
  mapSessionInfo,
  toPiMessages,
} from "./piNodeMapping";

const ev = (body: unknown): AgentSessionEvent => body as AgentSessionEvent;

describe("mapSessionEvent", () => {
  it("passes agent_start through unchanged", () => {
    expect(
      mapSessionEvent(ev({ type: "agent_start" }), { turnIndex: 0 }),
    ).toEqual({
      type: "agent_start",
    });
  });

  it("carries willRetry on agent_end", () => {
    expect(
      mapSessionEvent(
        ev({ type: "agent_end", messages: [], willRetry: true }),
        {
          turnIndex: 3,
        },
      ),
    ).toEqual({ type: "agent_end", willRetry: true });
  });

  it("stamps the supervisor-derived turnIndex on turn_start/turn_end", () => {
    expect(
      mapSessionEvent(ev({ type: "turn_start" }), { turnIndex: 2 }),
    ).toEqual({
      type: "turn_start",
      turnIndex: 2,
    });
    expect(
      mapSessionEvent(ev({ type: "turn_end", message: {}, toolResults: [] }), {
        turnIndex: 2,
      }),
    ).toEqual({ type: "turn_end", turnIndex: 2 });
  });

  it("forwards message_update with its structured assistant delta", () => {
    const delta = {
      type: "text_delta",
      contentIndex: 0,
      delta: "hi",
      partial: {},
    };
    const message = { role: "assistant", content: [] };
    expect(
      mapSessionEvent(
        ev({ type: "message_update", message, assistantMessageEvent: delta }),
        { turnIndex: 0 },
      ),
    ).toEqual({
      type: "message_update",
      message,
      assistantMessageEvent: delta,
    });
  });

  it("maps tool execution lifecycle, keeping toolName on update", () => {
    expect(
      mapSessionEvent(
        ev({
          type: "tool_execution_update",
          toolCallId: "tc1",
          toolName: "bash",
          args: { command: "ls" },
          partialResult: { content: [{ type: "text", text: "a" }] },
        }),
        { turnIndex: 0 },
      ),
    ).toEqual({
      type: "tool_execution_update",
      toolCallId: "tc1",
      toolName: "bash",
      partialResult: { content: [{ type: "text", text: "a" }] },
    });
    expect(
      mapSessionEvent(
        ev({
          type: "tool_execution_end",
          toolCallId: "tc1",
          toolName: "bash",
          result: { content: [] },
          isError: false,
        }),
        { turnIndex: 0 },
      ),
    ).toEqual({
      type: "tool_execution_end",
      toolCallId: "tc1",
      result: { content: [] },
      isError: false,
    });
  });

  it("normalizes compaction_end to the JSON-safe subset", () => {
    expect(
      mapSessionEvent(
        ev({
          type: "compaction_end",
          reason: "threshold",
          result: undefined,
          aborted: false,
          willRetry: true,
          errorMessage: "x",
        }),
        { turnIndex: 0 },
      ),
    ).toEqual({ type: "compaction_end", aborted: false, willRetry: true });
  });

  it("reduces auto_retry events to attempt/delay and success", () => {
    expect(
      mapSessionEvent(
        ev({
          type: "auto_retry_start",
          attempt: 2,
          maxAttempts: 5,
          delayMs: 1000,
          errorMessage: "overloaded",
        }),
        { turnIndex: 0 },
      ),
    ).toEqual({ type: "auto_retry_start", attempt: 2, delayMs: 1000 });
    expect(
      mapSessionEvent(
        ev({ type: "auto_retry_end", success: true, attempt: 2 }),
        { turnIndex: 0 },
      ),
    ).toEqual({ type: "auto_retry_end", success: true });
  });

  it("omits an absent session name (exactOptionalPropertyTypes)", () => {
    expect(
      mapSessionEvent(ev({ type: "session_info_changed", name: undefined }), {
        turnIndex: 0,
      }),
    ).toEqual({ type: "session_info_changed" });
    expect(
      mapSessionEvent(ev({ type: "session_info_changed", name: "Build" }), {
        turnIndex: 0,
      }),
    ).toEqual({ type: "session_info_changed", name: "Build" });
  });

  it("passes an unknown future event type through for the controller to refresh on", () => {
    expect(
      mapSessionEvent(ev({ type: "some_future_event", blob: 1 }), {
        turnIndex: 0,
      }),
    ).toEqual({ type: "some_future_event" });
  });
});

describe("toPiMessages", () => {
  it("maps a transcript as a type-boundary identity", () => {
    const messages = [
      { role: "user", content: "hi", timestamp: 1 },
      { role: "assistant", content: [], timestamp: 2 },
    ];
    expect(toPiMessages(messages as never)).toEqual(messages);
  });
});

describe("mapSessionInfo", () => {
  const base: SessionInfo = {
    path: "/ws/.pi/agent/sessions/abc/s1.jsonl",
    id: "s1",
    cwd: "/ws",
    created: new Date("2026-05-01T00:00:00.000Z"),
    modified: new Date("2026-05-02T00:00:00.000Z"),
    messageCount: 4,
    firstMessage: "Fix the build please",
    allMessagesText: "...",
  };

  it("prefers the session name, then first message, then file basename", () => {
    expect(mapSessionInfo({ ...base, name: "  My Session  " }).title).toBe(
      "My Session",
    );
    expect(mapSessionInfo(base).title).toBe("Fix the build please");
    expect(mapSessionInfo({ ...base, firstMessage: "" }).title).toBe(
      "s1.jsonl",
    );
  });

  it("preserves Pi handles and merges live status over the catalog default", () => {
    const meta = mapSessionInfo(base, { liveStatus: "running" });
    expect(meta).toMatchObject({
      id: "s1",
      status: "running",
      workspacePath: "/ws",
      sessionFile: base.path,
      messageCount: 4,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z",
    });
    expect(mapSessionInfo(base).status).toBe("idle");
  });

  it("omits workspacePath for legacy sessions with empty cwd", () => {
    const meta = mapSessionInfo({ ...base, cwd: "" });
    expect("workspacePath" in meta).toBe(false);
  });

  it("carries parentSessionPath only when forked", () => {
    expect("parentSessionPath" in mapSessionInfo(base)).toBe(false);
    expect(
      mapSessionInfo({ ...base, parentSessionPath: "/ws/p.jsonl" })
        .parentSessionPath,
    ).toBe("/ws/p.jsonl");
  });
});

describe("deriveReadiness", () => {
  it("reports missing-model when no model is selected", () => {
    const readiness = deriveReadiness({ model: undefined });
    expect(readiness.state).toBe("missing-model");
  });

  it("reports ready with the provider/model selection and source", () => {
    expect(
      deriveReadiness({
        model: { provider: "anthropic", id: "claude-opus-4-5" },
        source: "env",
      }),
    ).toEqual({
      state: "ready",
      selection: { provider: "anthropic", modelId: "claude-opus-4-5" },
      source: "env",
    });
  });
});
