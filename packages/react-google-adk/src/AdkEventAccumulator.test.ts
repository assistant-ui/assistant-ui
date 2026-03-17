import { describe, it, expect } from "vitest";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import type { AdkEvent, AdkMessage } from "./types";

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

  it("generates a UUID for functionCall without an id", () => {
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

  it("marks as final when longRunningToolIds is non-empty", () => {
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
    expect(msgs[0]).toMatchObject({
      status: { type: "complete", reason: "stop" },
    });
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

  it("records auth request from adk_request_credential", () => {
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
                args: {
                  function_call_id: "tc-original",
                  auth_config: { type: "oauth2" },
                },
              },
            },
          ],
        },
      }),
    );
    const reqs = acc.getAuthRequests();
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({
      toolCallId: "tc-original",
      authConfig: { type: "oauth2" },
    });
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
    acc.processEvent(makeTextEvent("hello", false, "user"));
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
