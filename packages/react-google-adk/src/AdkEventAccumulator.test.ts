import { describe, it, expect } from "vitest";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import { parseAdkEventValue } from "./parseAdkEvent";
import type { AdkEvent, AdkMessage, AdkMessageContentPart } from "./types";

const makeEvent = (overrides: Partial<AdkEvent> = {}): AdkEvent => ({
  id: "evt-1",
  ...overrides,
});

const makeTextEvent = (
  text: string,
  partial?: boolean,
  author = "agent",
): AdkEvent =>
  makeEvent({
    author,
    partial,
    content: { role: "model", parts: [{ text }] },
  });

describe.each(["user", "agent"])("%s function response status", (author) => {
  it.each([
    [{ error: "denied" }, "error"],
    [{ error: { message: "denied" }, output: "partial" }, "error"],
    [{ error: null }, "error"],
    [{ error: false }, "error"],
    [{ error: "" }, "error"],
    [{ output: { error: "application data" } }, "success"],
    [{ result: "done" }, "success"],
    [{}, "success"],
  ] as const)("classifies response %j as %s", (response, status) => {
    const acc = new AdkEventAccumulator();
    const messages = acc.processEvent(
      makeEvent({
        author,
        content: {
          parts: [
            {
              functionResponse: { id: "tc-1", name: "search", response },
            },
          ],
        },
      }),
    );
    expect(messages).toMatchObject([
      {
        type: "tool",
        tool_call_id: "tc-1",
        status,
        content: JSON.stringify(response),
      },
    ]);
  });
});

describe("AdkEventAccumulator - text handling", () => {
  it("accumulates a single non-partial text event into an AI message", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(makeTextEvent("Hello world"));
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "Hello world" }],
      status: { type: "complete", reason: "stop" },
    });
  });

  it("accumulates partial text deltas into a single text content part", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(makeTextEvent("Hel", true));
    const msgs = acc.processEvent(makeTextEvent("lo", true));
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "Hello" }],
    });
  });

  it("replaces partial buffer with final non-partial text", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(makeTextEvent("Hel", true));
    acc.processEvent(makeTextEvent("lo", true));
    const msgs = acc.processEvent(makeTextEvent("Hello world"));
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "Hello world" }],
      status: { type: "complete", reason: "stop" },
    });
  });
});

describe("AdkEventAccumulator - reasoning/thought", () => {
  it("accumulates thought text as reasoning content part", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [{ text: "thinking...", thought: true }],
        },
      }),
    );
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [{ type: "reasoning", text: "thinking..." }],
    });
  });

  it("accumulates partial reasoning deltas", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        content: { role: "model", parts: [{ text: "think", thought: true }] },
      }),
    );
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        content: { role: "model", parts: [{ text: "ing", thought: true }] },
      }),
    );
    expect(msgs[0]).toMatchObject({
      content: [{ type: "reasoning", text: "thinking" }],
    });
  });
});

describe("AdkEventAccumulator - function calls", () => {
  it("creates a tool_calls entry from a functionCall part", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [
            {
              functionCall: { name: "search", id: "tc-1", args: { q: "test" } },
            },
          ],
        },
      }),
    );
    expect(msgs[0]).toMatchObject({
      type: "ai",
      tool_calls: [{ id: "tc-1", name: "search", args: { q: "test" } }],
    });
  });

  it("generates an ID for functionCall without an id", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [{ functionCall: { name: "search", args: {} } }],
        },
      }),
    );
    const tc = (msgs[0] as AdkMessage & { type: "ai" }).tool_calls;
    expect(tc).toHaveLength(1);
    expect(tc![0]!.id).toBeTruthy();
  });

  it("skips partial functionCall events", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        content: {
          role: "model",
          parts: [{ functionCall: { name: "search", id: "tc-1", args: {} } }],
        },
      }),
    );
    expect(msgs).toHaveLength(0);
  });

  it("emits functionCall only from the final aggregated event", () => {
    const acc = new AdkEventAccumulator();
    // Partial event with empty args
    acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        content: {
          role: "model",
          parts: [{ functionCall: { name: "search", id: "tc-1", args: {} } }],
        },
      }),
    );
    // Final event with complete args
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                name: "search",
                id: "tc-1",
                args: { q: "test" },
              },
            },
          ],
        },
      }),
    );
    const aiMsg = msgs[0] as AdkMessage & { type: "ai" };
    expect(aiMsg.tool_calls).toHaveLength(1);
    expect(aiMsg.tool_calls![0]).toMatchObject({
      id: "tc-1",
      name: "search",
      args: { q: "test" },
    });
  });

  it("skips partial special function calls (confirmation/auth)", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                name: "adk_request_confirmation",
                id: "tc-1",
                args: {},
              },
            },
          ],
        },
      }),
    );
    expect(acc.getToolConfirmations()).toHaveLength(0);
  });

  const requestEvent = (name: string) =>
    makeEvent({
      author: "agent",
      content: {
        role: "model",
        parts: [{ functionCall: { name, id: "rc-1" } }, { text: "still here" }],
      },
    });

  it("keeps an args-less confirmation call answerable", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(requestEvent("adk_request_confirmation"));

    expect(acc.getToolConfirmations()).toEqual([
      {
        toolCallId: "rc-1",
        toolName: "",
        args: {},
        hint: "",
        confirmed: false,
      },
    ]);
    expect((msgs[0] as AdkMessage & { type: "ai" }).tool_calls).toEqual([
      {
        id: "rc-1",
        name: "adk_request_confirmation",
        args: {},
        argsText: "{}",
      },
    ]);
    expect(msgs[0]).toMatchObject({
      content: [{ type: "text", text: "still here" }],
    });
  });

  it("keeps an args-less credential call answerable", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(requestEvent("adk_request_credential"));

    expect(acc.getAuthRequests()).toEqual([
      { toolCallId: "rc-1", authConfig: undefined },
    ]);
    expect((msgs[0] as AdkMessage & { type: "ai" }).tool_calls).toEqual([
      {
        id: "rc-1",
        name: "adk_request_credential",
        args: {},
        argsText: "{}",
      },
    ]);
    expect(msgs[0]).toMatchObject({
      content: [{ type: "text", text: "still here" }],
    });
  });

  it("defaults an ordinary call without args to empty args", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [{ functionCall: { name: "search", id: "tc-1" } }],
        },
      }),
    );

    expect((msgs[0] as AdkMessage & { type: "ai" }).tool_calls).toEqual([
      { id: "tc-1", name: "search", args: {}, argsText: "{}" },
    ]);
  });
});

describe("AdkEventAccumulator - function responses", () => {
  it("creates a tool message from a functionResponse part", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [
            {
              functionResponse: {
                name: "search",
                id: "tc-1",
                response: { results: [] },
              },
            },
          ],
        },
      }),
    );
    expect(msgs[0]).toMatchObject({
      type: "tool",
      tool_call_id: "tc-1",
      name: "search",
      content: JSON.stringify({ results: [] }),
    });
  });

  it("skips a user function response that answers no call", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: "adk_request_confirmation",
                response: { confirmed: true },
              },
            },
          ],
        },
      }),
    );
    // Without an id it answers no call: core drops it as an orphan, and
    // keeping it would let it settle the confirmation batch it grouped into.
    expect(msgs.filter((m) => m.type === "tool")).toEqual([]);
  });

  // A session load replays the stored events through a fresh accumulator.
  it("gives a tool message the same id on every replay of an event", () => {
    const event = makeEvent({
      id: "evt-tool",
      author: "agent",
      content: {
        role: "model",
        parts: [
          {
            functionResponse: {
              name: "search",
              id: "tc-1",
              response: { results: [] },
            },
          },
        ],
      },
    });

    const first = new AdkEventAccumulator().processEvent(event);
    const second = new AdkEventAccumulator().processEvent(event);

    expect(first[0]!.id).toBe(second[0]!.id);
  });

  it("keeps two tool messages from one event distinct", () => {
    const msgs = new AdkEventAccumulator().processEvent(
      makeEvent({
        id: "evt-tool",
        author: "agent",
        content: {
          role: "model",
          parts: [
            {
              functionResponse: {
                name: "search",
                id: "tc-1",
                response: { a: 1 },
              },
            },
            {
              functionResponse: {
                name: "lookup",
                id: "tc-2",
                response: { b: 2 },
              },
            },
          ],
        },
      }),
    );

    const toolMessages = msgs.filter((m) => m.type === "tool");
    expect(toolMessages).toHaveLength(2);
    expect(toolMessages[0]!.id).not.toBe(toolMessages[1]!.id);
  });

  it("gives an assistant message the same id on every replay", () => {
    const events = [
      makeTextEvent("Hel", true),
      makeTextEvent("lo", true),
      makeTextEvent("Hello"),
    ];
    const replay = () => {
      const acc = new AdkEventAccumulator();
      let msgs: AdkMessage[] = [];
      for (const event of events) msgs = acc.processEvent(event);
      return msgs;
    };

    expect(replay().map((m) => m.id)).toEqual(replay().map((m) => m.id));
  });

  it("keeps two assistant messages opened by one event distinct and stable", () => {
    const event = makeEvent({
      id: "evt-mixed",
      author: "agent",
      content: {
        role: "model",
        parts: [
          { text: "before" },
          {
            functionResponse: {
              name: "search",
              id: "tc-1",
              response: { ok: true },
            },
          },
          { text: "after" },
        ],
      },
    });

    const first = new AdkEventAccumulator().processEvent(event);
    const second = new AdkEventAccumulator().processEvent(event);

    const aiIds = first.filter((m) => m.type === "ai").map((m) => m.id);
    expect(aiIds.length).toBeGreaterThan(1);
    expect(new Set(aiIds).size).toBe(aiIds.length);
    expect(first.map((m) => m.id)).toEqual(second.map((m) => m.id));
  });

  it("keeps two tool messages distinct when the payload omits response ids", () => {
    const event = makeEvent({
      id: "evt-tool",
      author: "agent",
      content: {
        role: "model",
        parts: [
          { functionResponse: { name: "search", response: { a: 1 } } },
          { functionResponse: { name: "lookup", response: { b: 2 } } },
        ],
      },
    });

    const first = new AdkEventAccumulator()
      .processEvent(event)
      .filter((m) => m.type === "tool");
    const second = new AdkEventAccumulator()
      .processEvent(event)
      .filter((m) => m.type === "tool");

    expect(first).toHaveLength(2);
    expect(first[0]!.id).not.toBe(first[1]!.id);
    expect(first.map((m) => m.id)).toEqual(second.map((m) => m.id));
  });
});

describe("AdkEventAccumulator - code execution", () => {
  it("creates code and code_result content parts", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        content: {
          role: "model",
          parts: [{ executableCode: { code: "print(1)", language: "python" } }],
        },
      }),
    );
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [
            { codeExecutionResult: { output: "1", outcome: "OUTCOME_OK" } },
          ],
        },
      }),
    );
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [
        { type: "code", code: "print(1)", language: "python" },
        { type: "code_result", output: "1", outcome: "OUTCOME_OK" },
      ],
    });
  });
});

describe("AdkEventAccumulator - error handling", () => {
  it("creates an error message with text and incomplete status", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        errorCode: "500",
        errorMessage: "Server error",
      }),
    );
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "Server error" }],
      status: { type: "incomplete", reason: "error", error: "Server error" },
    });
  });

  it("uses errorCode when errorMessage is absent", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({ author: "agent", errorCode: "UNKNOWN_ERROR" }),
    );
    expect(msgs[0]).toMatchObject({
      content: [{ type: "text", text: "UNKNOWN_ERROR" }],
      status: { type: "incomplete", reason: "error", error: "UNKNOWN_ERROR" },
    });
  });
});

describe("AdkEventAccumulator - interrupted events", () => {
  it("sets status to incomplete/cancelled on the current message", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(makeTextEvent("Hello", true));
    const msgs = acc.processEvent(
      makeEvent({ author: "agent", interrupted: true }),
    );
    expect(msgs[0]).toMatchObject({
      status: { type: "incomplete", reason: "cancelled" },
    });
  });
});

describe("AdkEventAccumulator - finish reasons", () => {
  it("sets complete/stop for normal completion", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(makeTextEvent("Done"));
    expect(msgs[0]).toMatchObject({
      status: { type: "complete", reason: "stop" },
    });
  });

  it("sets incomplete/length for MAX_TOKENS", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        finishReason: "MAX_TOKENS",
        content: { role: "model", parts: [{ text: "truncated" }] },
      }),
    );
    expect(msgs[0]).toMatchObject({
      status: { type: "incomplete", reason: "length" },
    });
  });

  it("sets incomplete/content-filter for SAFETY", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        finishReason: "SAFETY",
        content: { role: "model", parts: [{ text: "" }] },
      }),
    );
    expect(msgs[0]).toMatchObject({
      status: { type: "incomplete", reason: "content-filter" },
    });
  });

  it("sets incomplete/error for MALFORMED_FUNCTION_CALL", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        finishReason: "MALFORMED_FUNCTION_CALL",
        content: { role: "model", parts: [{ text: "bad" }] },
      }),
    );
    expect(msgs[0]).toMatchObject({
      status: { type: "incomplete", reason: "error" },
    });
  });
});

describe("AdkEventAccumulator - isFinalResponse logic", () => {
  it("does NOT mark as final when event has functionCall parts", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [{ functionCall: { name: "tool", args: {} } }],
        },
      }),
    );
    expect((msgs[0] as AdkMessage & { type: "ai" }).status).toBeUndefined();
  });

  it("marks as final when skipSummarization is true, even with partial", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        partial: true,
        actions: { skipSummarization: true },
        content: { role: "model", parts: [{ text: "skipped" }] },
      }),
    );
    expect(msgs[0]).toMatchObject({
      status: { type: "complete", reason: "stop" },
    });
  });

  it("HITL event leaves status undefined for auto-status", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["lrt-1"],
        content: {
          role: "model",
          parts: [
            { functionCall: { name: "slow_tool", id: "lrt-1", args: {} } },
          ],
        },
      }),
    );
    expect((msgs[0] as AdkMessage & { type: "ai" }).status).toBeUndefined();
  });
});

describe("AdkEventAccumulator - HITL requires-action", () => {
  const makeHitlEvent = (
    toolCallId: string,
    overrides: Partial<AdkEvent> = {},
  ): AdkEvent =>
    makeEvent({
      author: "agent",
      longRunningToolIds: [toolCallId],
      content: {
        parts: [
          {
            functionCall: {
              id: toolCallId,
              name: "adk_request_input",
              args: { message: "What's the forecast period?" },
            },
          },
        ],
      },
      ...overrides,
    });

  it("produces an AI message with tool call and no manual status", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(makeHitlEvent("tc-1"));

    expect(msgs).toHaveLength(1);
    const aiMsg = msgs[0] as AdkMessage & { type: "ai" };
    expect(aiMsg.type).toBe("ai");
    expect(aiMsg.tool_calls).toHaveLength(1);
    expect(aiMsg.tool_calls![0]!.id).toBe("tc-1");
    expect(aiMsg.tool_calls![0]!.name).toBe("adk_request_input");
    expect(aiMsg.status).toBeUndefined();
  });

  it("stays pending across a subsequent bookkeeping event", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(makeHitlEvent("tc-1", { author: "WorkflowA" }));

    const msgs = acc.processEvent(
      makeEvent({
        id: "evt-bookkeeping",
        author: "WorkflowA",
        actions: { stateDelta: { waiting_for_user: true } },
      }),
    );

    const aiMsg = msgs.find(
      (m): m is AdkMessage & { type: "ai" } =>
        m.type === "ai" && (m.tool_calls?.length ?? 0) > 0,
    );
    expect(aiMsg).toBeDefined();
    expect(aiMsg!.tool_calls![0]!.id).toBe("tc-1");
    expect(aiMsg!.status).toBeUndefined();
  });

  it("prioritizes skipSummarization over longRunningToolIds", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["lrt-both"],
        actions: { skipSummarization: true },
        content: {
          role: "model",
          parts: [
            { functionCall: { name: "slow_tool", id: "lrt-both", args: {} } },
          ],
        },
      }),
    );

    expect(msgs[0]).toMatchObject({
      status: { type: "complete", reason: "stop" },
    });
  });

  it("ignores empty longRunningToolIds array for HITL guard", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: [],
        content: { role: "model", parts: [{ text: "Done." }] },
      }),
    );

    expect(msgs[0]).toMatchObject({
      status: { type: "complete", reason: "stop" },
    });
  });

  it("preserves text and skips status when partial text precedes HITL event", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "ClarifyAgent",
        partial: true,
        content: {
          role: "model",
          parts: [{ text: "Let me ask about " }],
        },
      }),
    );

    const msgs = acc.processEvent(
      makeHitlEvent("tc-1", { author: "ClarifyAgent" }),
    );

    const aiMsg = msgs.find(
      (m): m is AdkMessage & { type: "ai" } =>
        m.type === "ai" && (m.tool_calls?.length ?? 0) > 0,
    );
    expect(aiMsg).toBeDefined();
    expect(aiMsg!.tool_calls).toHaveLength(1);
    const parts = aiMsg!.content as AdkMessageContentPart[];
    expect(
      parts.some((c) => c.type === "text" && c.text.includes("Let me ask")),
    ).toBe(true);
    expect(aiMsg!.status).toBeUndefined();
  });

  it("keeps status undefined for mixed text and functionCall content", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["mixed-tc-1"],
        content: {
          role: "model",
          parts: [
            { text: "I need some clarification." },
            {
              functionCall: {
                id: "mixed-tc-1",
                name: "adk_request_input",
                args: { message: "Which region?" },
              },
            },
          ],
        },
      }),
    );

    const aiMsg = msgs[0] as AdkMessage & { type: "ai" };
    const parts = aiMsg.content as AdkMessageContentPart[];
    expect(parts.some((c) => c.type === "text")).toBe(true);
    expect(aiMsg.tool_calls).toHaveLength(1);
    expect(aiMsg.tool_calls![0]!.id).toBe("mixed-tc-1");
    expect(aiMsg.status).toBeUndefined();
  });

  it("handles multiple tool calls with partial longRunningToolIds overlap", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["tc-hitl"],
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                id: "tc-hitl",
                name: "adk_request_input",
                args: { message: "Confirm?" },
              },
            },
            {
              functionCall: {
                id: "tc-regular",
                name: "fetch_data",
                args: { url: "https://example.com" },
              },
            },
          ],
        },
      }),
    );

    const aiMsg = msgs[0] as AdkMessage & { type: "ai" };
    expect(aiMsg.tool_calls).toHaveLength(2);
    expect(aiMsg.tool_calls!.map((tc) => tc.id).sort()).toEqual(
      ["tc-hitl", "tc-regular"].sort(),
    );
    expect(aiMsg.status).toBeUndefined();
  });

  it("does not override HITL guard with explicit finishReason", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeHitlEvent("tc-fr", { finishReason: "STOP" }),
    );

    const aiMsg = msgs[0] as AdkMessage & { type: "ai" };
    expect(aiMsg.status).toBeUndefined();
  });

  it("produces separate messages without status for sequential HITL events", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeHitlEvent("tc-seq-1", { id: "evt-1", author: "WorkflowA" }),
    );

    const msgs = acc.processEvent(
      makeEvent({
        id: "evt-2",
        author: "WorkflowB",
        longRunningToolIds: ["tc-seq-2"],
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                id: "tc-seq-2",
                name: "adk_request_confirmation",
                args: {
                  originalFunctionCall: { name: "delete_all", args: {} },
                  toolConfirmation: { hint: "Sure?", payload: {} },
                },
              },
            },
          ],
        },
      }),
    );

    const hitlMsgs = msgs.filter(
      (m): m is AdkMessage & { type: "ai" } =>
        m.type === "ai" && (m.tool_calls?.length ?? 0) > 0,
    );
    expect(hitlMsgs).toHaveLength(2);
    expect(hitlMsgs[0]!.status).toBeUndefined();
    expect(hitlMsgs[1]!.status).toBeUndefined();
    expect(hitlMsgs[0]!.tool_calls![0]!.id).toBe("tc-seq-1");
    expect(hitlMsgs[1]!.tool_calls![0]!.id).toBe("tc-seq-2");
  });
});

describe("AdkEventAccumulator - actions tracking", () => {
  it("accumulates stateDelta across multiple events", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        actions: { stateDelta: { a: 1 } },
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    acc.processEvent(
      makeEvent({
        actions: { stateDelta: { b: 2 } },
        author: "agent",
        content: { parts: [{ text: "y" }] },
      }),
    );
    expect(acc.getStateDelta()).toEqual({ a: 1, b: 2 });
  });

  it("accumulates artifactDelta", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        actions: { artifactDelta: { "file.txt": 1 } },
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    expect(acc.getArtifactDelta()).toEqual({ "file.txt": 1 });
  });

  it("preserves prototype-named state and artifact keys", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        actions: {
          stateDelta: JSON.parse('{"__proto__":"session"}'),
          artifactDelta: JSON.parse('{"__proto__":1}'),
        },
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );

    const stateDelta = acc.getStateDelta();
    const artifactDelta = acc.getArtifactDelta();
    expect(Object.hasOwn(stateDelta, "__proto__")).toBe(true);
    expect(stateDelta["__proto__"]).toBe("session");
    expect(Object.hasOwn(artifactDelta, "__proto__")).toBe(true);
    expect(artifactDelta["__proto__"]).toBe(1);
  });

  it("tracks escalation flag", () => {
    const acc = new AdkEventAccumulator();
    expect(acc.isEscalated()).toBe(false);
    acc.processEvent(
      makeEvent({
        actions: { escalate: true },
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    expect(acc.isEscalated()).toBe(true);
  });

  it("tracks transferToAgent", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        actions: { transferToAgent: "sub_agent" },
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    expect(acc.getLastTransferToAgent()).toBe("sub_agent");
  });

  it("tracks longRunningToolIds", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        longRunningToolIds: ["lrt-1", "lrt-2"],
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    expect(acc.getLongRunningToolIds()).toEqual(["lrt-1", "lrt-2"]);
  });

  it("unions longRunningToolIds across multiple events", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        longRunningToolIds: ["lrt-1"],
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    acc.processEvent(
      makeEvent({
        longRunningToolIds: ["lrt-2"],
        author: "agent",
        content: { parts: [{ text: "y" }] },
      }),
    );
    expect(acc.getLongRunningToolIds()).toEqual(["lrt-1", "lrt-2"]);
  });

  it("deduplicates repeated longRunningToolIds", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        longRunningToolIds: ["lrt-1"],
        author: "agent",
        content: { parts: [{ text: "x" }] },
      }),
    );
    acc.processEvent(
      makeEvent({
        longRunningToolIds: ["lrt-1"],
        author: "agent",
        content: { parts: [{ text: "y" }] },
      }),
    );
    expect(acc.getLongRunningToolIds()).toEqual(["lrt-1"]);
  });

  it("settles a long-running id when a user-authored response answers it", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["lrt-1", "lrt-2"],
        content: {
          parts: [
            {
              functionCall: { name: "ask_for_approval", id: "lrt-1", args: {} },
            },
            {
              functionCall: { name: "ask_for_approval", id: "lrt-2", args: {} },
            },
          ],
        },
      }),
    );
    acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          parts: [
            {
              functionResponse: {
                name: "ask_for_approval",
                id: "lrt-1",
                response: { status: "approved" },
              },
            },
          ],
        },
      }),
    );
    expect(acc.getLongRunningToolIds()).toEqual(["lrt-2"]);
  });

  it("keeps a long-running id pending through the interim response ADK authors", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["lrt-1"],
        content: {
          parts: [
            {
              functionCall: { name: "ask_for_approval", id: "lrt-1", args: {} },
            },
          ],
        },
      }),
    );
    acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          parts: [
            {
              functionResponse: {
                name: "ask_for_approval",
                id: "lrt-1",
                response: { status: "pending" },
              },
            },
          ],
        },
      }),
    );
    expect(acc.getLongRunningToolIds()).toEqual(["lrt-1"]);
  });

  it("seeds and settles longRunningToolIds from a user response", () => {
    const acc = new AdkEventAccumulator([], ["lrt-1", "lrt-2"]);
    acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              functionResponse: {
                id: "lrt-1",
                name: "adk_request_confirmation",
                response: { confirmed: true },
              },
            },
          ],
        },
      }),
    );
    expect(acc.getLongRunningToolIds()).toEqual(["lrt-2"]);
  });
});

describe("AdkEventAccumulator - special function calls", () => {
  it("records tool confirmation from adk_request_confirmation", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        longRunningToolIds: ["tc-1"],
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                name: "adk_request_confirmation",
                id: "tc-1",
                args: {
                  originalFunctionCall: {
                    name: "delete_file",
                    args: { path: "/tmp" },
                  },
                  toolConfirmation: { hint: "Are you sure?", payload: {} },
                },
              },
            },
          ],
        },
      }),
    );
    const confs = acc.getToolConfirmations();
    expect(confs).toHaveLength(1);
    expect(confs[0]).toMatchObject({
      toolCallId: "tc-1",
      toolName: "delete_file",
      args: { path: "/tmp" },
      hint: "Are you sure?",
      confirmed: false,
    });
  });

  it.each([
    [
      "snake_case",
      { function_call_id: "tc-original", auth_config: { type: "oauth2" } },
    ],
    [
      "camelCase",
      { functionCallId: "tc-original", authConfig: { type: "oauth2" } },
    ],
  ])(
    "records an auth request under its adk_request_credential call id (%s args)",
    (_, args) => {
      const acc = new AdkEventAccumulator();
      acc.processEvent(
        makeEvent({
          author: "agent",
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  name: "adk_request_credential",
                  id: "cred-1",
                  args,
                },
              },
            ],
          },
        }),
      );
      expect(acc.getAuthRequests()).toEqual([
        { toolCallId: "cred-1", authConfig: { type: "oauth2" } },
      ]);
    },
  );

  it("skips null tool_calls entries when collecting confirmation and credential requests", () => {
    const acc = new AdkEventAccumulator([
      {
        id: "ai-1",
        type: "ai",
        content: [],
        tool_calls: [
          null,
          {
            id: "tc-1",
            name: "adk_request_confirmation",
            args: {
              originalFunctionCall: { name: "delete_file", args: {} },
              toolConfirmation: { hint: "Are you sure?" },
            },
          },
          {
            id: "cred-1",
            name: "adk_request_credential",
            args: { auth_config: { type: "oauth2" } },
          },
        ],
      } as unknown as AdkMessage,
    ]);
    expect(acc.getToolConfirmations()).toMatchObject([
      { toolCallId: "tc-1", toolName: "delete_file" },
    ]);
    expect(acc.getAuthRequests()).toEqual([
      { toolCallId: "cred-1", authConfig: { type: "oauth2" } },
    ]);
  });
});

describe.each([
  {
    name: "adk_request_confirmation",
    args: {
      originalFunctionCall: { id: "gated", name: "transfer", args: {} },
      toolConfirmation: { hint: "Transfer?" },
    },
    actions: {
      requestedToolConfirmations: { gated: { hint: "Transfer?" } },
    },
    reply: { confirmed: true },
    pending: (acc: AdkEventAccumulator) =>
      acc.getToolConfirmations().map((c) => c.toolCallId),
  },
  {
    name: "adk_request_credential",
    args: { function_call_id: "gated", auth_config: { credentialKey: "k" } },
    actions: {
      requestedAuthConfigs: {
        gated: { credentialKey: "k" },
        "gated-2": { credentialKey: "k" },
      },
    },
    reply: { exchangedAuthCredential: { authType: "apiKey", apiKey: "key" } },
    pending: (acc: AdkEventAccumulator) =>
      acc.getAuthRequests().map((r) => r.toolCallId),
  },
])("AdkEventAccumulator - pending $name requests", (request) => {
  const requestEvents: AdkEvent[] = [
    makeEvent({
      id: "call",
      author: "agent",
      content: {
        role: "model",
        parts: [
          { functionCall: { name: "transfer", id: "gated", args: {} } },
          { functionCall: { name: "transfer", id: "gated-2", args: {} } },
        ],
      },
    }),
    makeEvent({
      id: "request",
      author: "agent",
      longRunningToolIds: ["req"],
      actions: request.actions,
      content: {
        role: "user",
        parts: [
          {
            functionCall: { name: request.name, id: "req", args: request.args },
          },
        ],
      },
    }),
    makeEvent({
      id: "interim",
      author: "agent",
      actions: request.actions,
      content: {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "gated",
              name: "transfer",
              response: { status: "pending" },
            },
          },
        ],
      },
    }),
  ];
  const replyPart = {
    functionResponse: {
      id: "req",
      name: request.name,
      response: request.reply,
    },
  };

  it("lists the request once, under its call, until the user replies to that call", () => {
    const acc = new AdkEventAccumulator();
    for (const event of requestEvents) acc.processEvent(event);
    expect(request.pending(acc)).toEqual(["req"]);

    acc.processEvent(
      makeEvent({
        id: "reply",
        author: "user",
        content: { role: "user", parts: [replyPart] },
      }),
    );
    expect(request.pending(acc)).toEqual([]);
  });

  it("carries the request into an accumulator seeded with the thread, which an optimistic reply settles", () => {
    const replayed = new AdkEventAccumulator();
    let messages: AdkMessage[] = [];
    for (const event of requestEvents) messages = replayed.processEvent(event);

    const acc = new AdkEventAccumulator(messages);
    expect(request.pending(acc)).toEqual(["req"]);

    acc.processEvent(
      makeEvent({
        id: "optimistic",
        content: { role: "user", parts: [replyPart] },
      }),
    );
    expect(request.pending(acc)).toEqual([]);
  });
});

describe("AdkEventAccumulator - confirmation replies", () => {
  it.each([
    [["req"], "an unreadable reply", { response: "not json" }],
    [[], "a denial", { confirmed: false }],
  ])("lists %j after %s", (pending, _, response) => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        id: "request",
        author: "agent",
        longRunningToolIds: ["req"],
        content: {
          role: "model",
          parts: [
            {
              functionCall: {
                name: "adk_request_confirmation",
                id: "req",
                args: {
                  originalFunctionCall: { id: "gated", name: "transfer" },
                },
              },
            },
          ],
        },
      }),
    );
    acc.processEvent(
      makeEvent({
        id: "reply",
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              functionResponse: {
                id: "req",
                name: "adk_request_confirmation",
                response,
              },
            },
          ],
        },
      }),
    );
    expect(acc.getToolConfirmations().map((c) => c.toolCallId)).toEqual(
      pending,
    );
  });
});

describe("AdkEventAccumulator - author/agent tracking", () => {
  it("tracks agent name and branch", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "search_agent",
        branch: "root.search_agent",
        content: { parts: [{ text: "hi" }] },
      }),
    );
    expect(acc.getAgentInfo()).toEqual({
      name: "search_agent",
      branch: "root.search_agent",
    });
  });

  it("does not track user as agent info", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "user",
        content: { role: "user", parts: [{ text: "hello" }] },
      }),
    );
    expect(acc.getAgentInfo()).toEqual({});
  });

  it("finalizes current message when author changes", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(makeTextEvent("From agent A", false, "agent_a"));
    const msgs = acc.processEvent(
      makeTextEvent("From agent B", false, "agent_b"),
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ type: "ai", author: "agent_a" });
    expect(msgs[1]).toMatchObject({ type: "ai", author: "agent_b" });
  });
});

describe("AdkEventAccumulator - snake_case normalization", () => {
  describe.each(["user", "agent"])("%s media", (author) => {
    it.each([
      {
        part: { inline_data: { mime_type: "image/png", data: "aGVsbG8=" } },
        expected: { type: "image", mimeType: "image/png", data: "aGVsbG8=" },
      },
      {
        part: {
          inline_data: { mime_type: "application/pdf", data: "aGVsbG8=" },
        },
        expected: {
          type: "file",
          mimeType: "application/pdf",
          data: "aGVsbG8=",
        },
      },
      {
        part: {
          file_data: {
            mime_type: "image/png",
            file_uri: "https://example.test/image.png",
          },
        },
        expected: { type: "image_url", url: "https://example.test/image.png" },
      },
      {
        part: {
          file_data: {
            mime_type: "application/pdf",
            file_uri: "https://example.test/report.pdf",
          },
        },
        expected: {
          type: "file_url",
          mimeType: "application/pdf",
          url: "https://example.test/report.pdf",
        },
      },
      {
        part: { inlineData: { mime_type: "image/png", data: "aGVsbG8=" } },
        expected: { type: "image", mimeType: "image/png", data: "aGVsbG8=" },
      },
      {
        part: {
          fileData: {
            mime_type: "application/pdf",
            file_uri: "https://example.test/report.pdf",
          },
        },
        expected: {
          type: "file_url",
          mimeType: "application/pdf",
          url: "https://example.test/report.pdf",
        },
      },
      {
        part: { inline_data: { mimeType: "image/png", data: "aGVsbG8=" } },
        expected: { type: "image", mimeType: "image/png", data: "aGVsbG8=" },
      },
      {
        part: {
          file_data: {
            mimeType: "application/pdf",
            fileUri: "https://example.test/report.pdf",
          },
        },
        expected: {
          type: "file_url",
          mimeType: "application/pdf",
          url: "https://example.test/report.pdf",
        },
      },
    ])(
      "normalizes media aliases without mutating the event: $part",
      ({ part, expected }) => {
        const input = { id: "media", author, content: { parts: [part] } };
        const original = structuredClone(input);
        const event = parseAdkEventValue(input, "test");
        const messages = new AdkEventAccumulator().processEvent(event);
        expect(messages).toMatchObject([
          { type: author === "user" ? "human" : "ai", content: [expected] },
        ]);
        expect(input).toEqual(original);
      },
    );
  });

  it("prefers camelCase media containers and nested values when both exist", () => {
    const event = parseAdkEventValue(
      {
        id: "media",
        author: "agent",
        content: {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                mime_type: "application/pdf",
                data: "aGVsbG8=",
              },
              inline_data: { mime_type: "text/plain", data: "wrong" },
            },
            {
              fileData: {
                mimeType: "application/pdf",
                mime_type: "image/png",
                fileUri: "https://example.test/right.pdf",
                file_uri: "https://example.test/wrong.png",
              },
              file_data: { file_uri: "https://example.test/other.png" },
            },
          ],
        },
      },
      "test",
    );
    expect(new AdkEventAccumulator().processEvent(event)).toMatchObject([
      {
        content: [
          { type: "image", mimeType: "image/png", data: "aGVsbG8=" },
          {
            type: "file_url",
            mimeType: "application/pdf",
            url: "https://example.test/right.pdf",
          },
        ],
      },
    ]);
  });

  it("leaves similarly named tool arguments untouched", () => {
    const args = { inline_data: { mime_type: "custom", file_uri: "opaque" } };
    const event = parseAdkEventValue(
      {
        id: "call",
        author: "agent",
        content: {
          parts: [{ function_call: { name: "test", id: "tc-1", args } }],
        },
      },
      "test",
    );
    expect(new AdkEventAccumulator().processEvent(event)).toMatchObject([
      { tool_calls: [{ args }] },
    ]);
  });

  it("normalizes function_call to functionCall in parts", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [{ function_call: { name: "test", args: {} } } as any],
        },
      }),
    );
    expect((msgs[0] as AdkMessage & { type: "ai" }).tool_calls).toHaveLength(1);
  });

  it("normalizes error_code on the event", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent({ id: "e1", error_code: "ERR" } as any);
    expect(msgs[0]).toMatchObject({
      status: { type: "incomplete", reason: "error" },
    });
  });

  it("normalizes snake_case action keys", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent({
      id: "e1",
      author: "agent",
      actions: { state_delta: { x: 1 }, transfer_to_agent: "sub" } as any,
      content: { parts: [{ text: "hi" }] },
    } as any);
    expect(acc.getStateDelta()).toEqual({ x: 1 });
    expect(acc.getLastTransferToAgent()).toBe("sub");
  });
});

describe("AdkEventAccumulator - metadata tracking", () => {
  it("tracks grounding and usage metadata per message", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        author: "agent",
        content: { role: "model", parts: [{ text: "hi" }] },
        groundingMetadata: { sources: ["google.com"] },
        usageMetadata: { promptTokenCount: 10 },
      }),
    );
    const meta = acc.getMessageMetadata();
    expect(meta.size).toBe(1);
    const first = [...meta.values()][0];
    expect(first).toMatchObject({
      groundingMetadata: { sources: ["google.com"] },
      usageMetadata: { promptTokenCount: 10 },
    });
  });
});

describe("AdkEventAccumulator - initial messages", () => {
  it("initializes with provided messages", () => {
    const initial: AdkMessage[] = [
      { id: "m1", type: "human", content: "Hello" },
    ];
    const acc = new AdkEventAccumulator(initial);
    expect(acc.getMessages()).toHaveLength(1);
  });

  it("appends new events after initial messages", () => {
    const initial: AdkMessage[] = [
      { id: "m1", type: "human", content: "Hello" },
    ];
    const acc = new AdkEventAccumulator(initial);
    const msgs = acc.processEvent(makeTextEvent("Hi there"));
    expect(msgs).toHaveLength(2);
  });
});

describe("AdkEventAccumulator - user message handling", () => {
  it("creates a human message for user-authored text events", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: { role: "user", parts: [{ text: "hello" }] },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: "hello",
    });
  });

  it("creates a tool message for a user-authored function response", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              functionResponse: {
                id: "tc-1",
                name: "adk_request_confirmation",
                response: { confirmed: true },
              },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "tool",
      tool_call_id: "tc-1",
      name: "adk_request_confirmation",
      content: JSON.stringify({ confirmed: true }),
      status: "success",
    });
  });

  it("orders function responses from one user event before its text", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            { text: "go ahead" },
            {
              functionResponse: {
                id: "tc-1",
                name: "adk_request_confirmation",
                response: { confirmed: true },
              },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ type: "tool", tool_call_id: "tc-1" });
    expect(msgs[1]).toMatchObject({ type: "human", content: "go ahead" });
  });

  it("creates separate human and AI messages for a user/agent turn", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        id: "u1",
        author: "user",
        content: { role: "user", parts: [{ text: "help" }] },
      }),
    );
    const msgs = acc.processEvent(makeTextEvent("How can I help?"));
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ type: "human", content: "help" });
    expect(msgs[1]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "How can I help?" }],
    });
  });

  it("handles multiple user/agent turns with correct message types", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(
      makeEvent({
        id: "u1",
        author: "user",
        content: { role: "user", parts: [{ text: "hello" }] },
      }),
    );
    acc.processEvent(makeTextEvent("Hi there!"));
    acc.processEvent(
      makeEvent({
        id: "u2",
        author: "user",
        content: { role: "user", parts: [{ text: "help" }] },
      }),
    );
    const msgs = acc.processEvent(makeTextEvent("How can I help?"));
    expect(msgs).toHaveLength(4);
    expect(msgs[0]).toMatchObject({ type: "human", content: "hello" });
    expect(msgs[1]).toMatchObject({ type: "ai" });
    expect(msgs[2]).toMatchObject({ type: "human", content: "help" });
    expect(msgs[3]).toMatchObject({ type: "ai" });
  });

  it("creates human message with image content", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [{ inlineData: { mimeType: "image/png", data: "abc123" } }],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [{ type: "image", mimeType: "image/png", data: "abc123" }],
    });
  });

  it("creates human message with mixed text and image content", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            { text: "Look at this" },
            { inlineData: { mimeType: "image/png", data: "abc123" } },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [
        { type: "text", text: "Look at this" },
        { type: "image", mimeType: "image/png", data: "abc123" },
      ],
    });
  });

  it("creates human message with image fileData content", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: "gs://bucket/image.png",
                mimeType: "image/png",
              },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [{ type: "image_url", url: "gs://bucket/image.png" }],
    });
  });

  it("routes non-image inlineData to a file part", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [
        { type: "file", mimeType: "application/pdf", data: "JVBERi0xLjQK" },
      ],
    });
  });

  it("routes non-image fileData to a file_url part", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: "gs://bucket/report.pdf",
                mimeType: "application/pdf",
              },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [
        {
          type: "file_url",
          url: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      ],
    });
  });

  it("coerces fileData with image mime to image_url even if it originated as file_url (intentional, image mime is canonical)", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: "https://example.com/photo.jpg",
                mimeType: "image/jpeg",
              },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [{ type: "image_url", url: "https://example.com/photo.jpg" }],
    });
  });

  it("falls back to image_url for fileData with no mimeType (preserves legacy round-trip)", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [{ fileData: { fileUri: "gs://bucket/unknown" } }],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "human",
      content: [{ type: "image_url", url: "gs://bucket/unknown" }],
    });
  });

  it("routes assistant non-image inlineData to a file part", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "assistant",
        content: {
          role: "model",
          parts: [{ inlineData: { mimeType: "audio/mpeg", data: "QUJDRA==" } }],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "ai",
      content: [{ type: "file", mimeType: "audio/mpeg", data: "QUJDRA==" }],
    });
  });

  it.each([
    {
      name: "inlineData without mimeType",
      part: { inlineData: { data: "abc123" } },
    },
    {
      name: "inlineData without data",
      part: { inlineData: { mimeType: "image/png" } },
    },
    {
      name: "fileData without fileUri",
      part: { fileData: { mimeType: "image/png" } },
    },
  ])("skips malformed $name while preserving valid content", ({ part }) => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [part as any, { text: "still here" }],
        },
      }),
    );

    expect(msgs).toMatchObject([
      { type: "ai", content: [{ type: "text", text: "still here" }] },
    ]);
  });

  it("skips malformed user media without creating an empty human message", () => {
    const acc = new AdkEventAccumulator();
    const malformedMedia = [
      { inlineData: { data: "abc123" } },
      { fileData: { mimeType: "application/pdf" } },
    ] as any[];

    expect(
      acc.processEvent(
        makeEvent({
          author: "user",
          content: { role: "user", parts: malformedMedia },
        }),
      ),
    ).toEqual([]);

    const msgs = acc.processEvent(
      makeEvent({
        author: "user",
        content: {
          role: "user",
          parts: [...malformedMedia, { text: "still here" }],
        },
      }),
    );

    expect(msgs).toMatchObject([{ type: "human", content: "still here" }]);
  });

  it("tool result events (no author, role:'user') still create tool messages", () => {
    // Regression: the user-author check must not hijack tool events.
    // messageToEvent for `type:'tool'` emits events without `author`,
    // with content.role:'user' and a functionResponse part.
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        content: {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: "get_weather",
                id: "call_1",
                response: { temp: 72 },
              },
            },
          ],
        },
      }),
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: "tool",
      name: "get_weather",
      tool_call_id: "call_1",
      content: JSON.stringify({ temp: 72 }),
    });
  });

  it("session replay produces correct message types", () => {
    // Simulate loading a session with alternating user/agent events
    const acc = new AdkEventAccumulator();
    const events: AdkEvent[] = [
      makeEvent({
        id: "e1",
        author: "user",
        content: { role: "user", parts: [{ text: "good morning" }] },
      }),
      // Workflow state-only events (no content)
      makeEvent({
        id: "e2",
        author: "WorkflowAgent",
        actions: { stateDelta: { intent: "greeting" } },
      }),
      // Final response with content
      makeEvent({
        id: "e3",
        author: "WorkflowAgent",
        content: { role: "model", parts: [{ text: "Hello! How can I help?" }] },
      }),
      // Second turn
      makeEvent({
        id: "e4",
        author: "user",
        content: { role: "user", parts: [{ text: "help" }] },
      }),
      makeEvent({
        id: "e5",
        author: "WorkflowAgent",
        content: {
          role: "model",
          parts: [{ text: "What do you need help with?" }],
        },
      }),
    ];
    let msgs: AdkMessage[] = [];
    for (const event of events) {
      msgs = acc.processEvent(event);
    }
    expect(msgs).toHaveLength(4);
    expect(msgs[0]).toMatchObject({ type: "human", content: "good morning" });
    expect(msgs[1]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "Hello! How can I help?" }],
    });
    expect(msgs[2]).toMatchObject({ type: "human", content: "help" });
    expect(msgs[3]).toMatchObject({
      type: "ai",
      content: [{ type: "text", text: "What do you need help with?" }],
    });
  });
});

describe("AdkEventAccumulator - multiple parts in one event", () => {
  it("keeps every text part of a single non-partial event in order", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: { role: "model", parts: [{ text: "A" }, { text: "B" }] },
      }),
    );

    expect(msgs[0]?.content).toEqual([
      { type: "text", text: "A" },
      { type: "text", text: "B" },
    ]);
  });

  it("preserves the Gemini code-execution shape", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [
            { text: "Here is the code:" },
            { executableCode: { code: "print(1)", language: "python" } },
            { codeExecutionResult: { outcome: "OUTCOME_OK", output: "1" } },
            { text: "The result is 1." },
          ],
        },
      }),
    );

    expect(msgs[0]?.content).toEqual([
      { type: "text", text: "Here is the code:" },
      { type: "code", code: "print(1)", language: "python" },
      { type: "code_result", output: "1", outcome: "OUTCOME_OK" },
      { type: "text", text: "The result is 1." },
    ]);
  });

  it("keeps every reasoning part of a single non-partial event", () => {
    const acc = new AdkEventAccumulator();
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [
            { text: "First thought", thought: true },
            { text: "Second thought", thought: true },
          ],
        },
      }),
    );

    expect(msgs[0]?.content).toEqual([
      { type: "reasoning", text: "First thought" },
      { type: "reasoning", text: "Second thought" },
    ]);
  });

  it("still replaces the streamed buffer with the final text", () => {
    const acc = new AdkEventAccumulator();
    acc.processEvent(makeTextEvent("Hel", true));
    acc.processEvent(makeTextEvent("lo", true));
    const msgs = acc.processEvent(
      makeEvent({
        author: "agent",
        content: {
          role: "model",
          parts: [{ text: "Hello" }, { text: "Again" }],
        },
      }),
    );

    expect(msgs[0]?.content).toEqual([
      { type: "text", text: "Hello" },
      { type: "text", text: "Again" },
    ]);
  });
});
