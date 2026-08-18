import { describe, expect, it } from "vitest";
import {
  projectAdkToolApprovals,
  toAdkConfirmationReply,
  toAdkToolConfirmationReply,
} from "./adkToolApproval";
import type { AdkMessage } from "./types";

const GATED_CALL = "adk-original-1";
const CONFIRMATION_CALL = "adk-confirmation-1";

const aiCall = (id: string, name: string, args = {}): AdkMessage => ({
  id: `ai-${id}`,
  type: "ai",
  content: [],
  tool_calls: [{ id, name, args }],
});

/**
 * The shape ADK actually emits: the gated tool call, then a synthetic
 * `adk_request_confirmation` call with an id of its own quoting the original.
 */
const requestedThread = (...tail: AdkMessage[]): AdkMessage[] => [
  aiCall(GATED_CALL, "delete_file", { path: "/tmp/a" }),
  aiCall(CONFIRMATION_CALL, "adk_request_confirmation", {
    originalFunctionCall: { id: GATED_CALL, name: "delete_file" },
    toolConfirmation: { hint: "Delete /tmp/a?" },
  }),
  ...tail,
];

const reply = (
  content: string,
  name = "adk_request_confirmation",
): AdkMessage => ({
  id: "tool-1",
  type: "tool",
  tool_call_id: CONFIRMATION_CALL,
  name,
  content,
  status: "success",
});

/** The id the accumulator mints for a function response: `<eventId>:<part>`. */
const eventReply = (
  eventId: string,
  partIndex: number,
  toolCallId: string,
  content: string,
): AdkMessage => ({
  id: `${eventId}:${partIndex}`,
  type: "tool",
  tool_call_id: toolCallId,
  name: "adk_request_confirmation",
  content,
  status: "success",
});

describe("projectAdkToolApprovals", () => {
  it.each([
    ["pending", requestedThread(), { id: CONFIRMATION_CALL }],
    [
      "approved",
      requestedThread(reply(JSON.stringify({ confirmed: true }))),
      { id: CONFIRMATION_CALL, approved: true },
    ],
    [
      "denied",
      requestedThread(reply(JSON.stringify({ confirmed: false }))),
      { id: CONFIRMATION_CALL, approved: false },
    ],
    [
      "approved through the ADK client wrapper",
      requestedThread(
        reply(
          JSON.stringify({ response: JSON.stringify({ confirmed: true }) }),
        ),
      ),
      { id: CONFIRMATION_CALL, approved: true },
    ],
    [
      "denied through the ADK client wrapper",
      requestedThread(
        reply(
          JSON.stringify({ response: JSON.stringify({ confirmed: false }) }),
        ),
      ),
      { id: CONFIRMATION_CALL, approved: false },
    ],
    // ADK reads a truthy response it cannot take a `confirmed` off — raw text,
    // a scalar, an array — as a tool it resumes unconfirmed, so the gate is
    // denied rather than left answerable.
    [
      "denied on a reply ADK resumes unconfirmed",
      requestedThread(reply("not json")),
      { id: CONFIRMATION_CALL, approved: false },
    ],
    [
      "denied on a scalar reply",
      requestedThread(reply("5")),
      { id: CONFIRMATION_CALL, approved: false },
    ],
    [
      "denied on a wrapped reply ADK parses to a scalar",
      requestedThread(reply(JSON.stringify({ response: "5" }))),
      { id: CONFIRMATION_CALL, approved: false },
    ],
    // A falsy response records no confirmation at all, so the gate stays open.
    [
      "still pending on a reply ADK records nothing for",
      requestedThread(reply("false")),
      { id: CONFIRMATION_CALL },
    ],
    [
      "still pending on an empty reply",
      requestedThread(reply("")),
      { id: CONFIRMATION_CALL },
    ],
    // ADK parses the wrapped text without a `try`, so these raise.
    [
      "still pending on an unreadable wrapped reply",
      requestedThread(reply(JSON.stringify({ response: "not json" }))),
      { id: CONFIRMATION_CALL },
    ],
    [
      "still pending on a wrapped reply ADK cannot stringify to JSON",
      requestedThread(reply(JSON.stringify({ response: { confirmed: true } }))),
      { id: CONFIRMATION_CALL },
    ],
    // `"response" in "x"` raises on a one-character response.
    [
      "still pending on a one-character reply",
      requestedThread(reply("x")),
      { id: CONFIRMATION_CALL },
    ],
    [
      "still pending when some other tool answers",
      requestedThread(
        reply(JSON.stringify({ confirmed: true }), "delete_file"),
      ),
      { id: CONFIRMATION_CALL },
    ],
  ])(
    "gates the confirmation and the call it gates: %s",
    (_name, messages, expected) => {
      const { approvals, key } = projectAdkToolApprovals(messages);
      // Both calls are in the transcript, so both would otherwise render an
      // approval control; the gated one carries the answerable synthetic id.
      expect([...approvals.keys()]).toEqual([CONFIRMATION_CALL, GATED_CALL]);
      expect(approvals.get(CONFIRMATION_CALL)).toEqual(expected);
      expect(approvals.get(GATED_CALL)).toEqual(expected);
      expect(key).not.toBe("");
    },
  );

  /**
   * ADK parses every function response in an event before running any tool, so
   * the unreadable reply aborts its whole event and the readable sibling never
   * executes either. Both gates stay answerable.
   */
  const UNREADABLE = JSON.stringify({ response: "not json" });

  it("keeps every confirmation from one event pending when one reply is unreadable", () => {
    const { approvals } = projectAdkToolApprovals([
      aiCall("conf-a", "adk_request_confirmation"),
      aiCall("conf-b", "adk_request_confirmation"),
      eventReply("evt-1", 0, "conf-a", JSON.stringify({ confirmed: true })),
      eventReply("evt-1", 1, "conf-b", UNREADABLE),
    ]);

    expect([...approvals.values()]).toEqual([
      { id: "conf-a" },
      { id: "conf-b" },
    ]);
  });

  it("settles a readable reply when the unreadable one came from another event", () => {
    const { approvals } = projectAdkToolApprovals([
      aiCall("conf-a", "adk_request_confirmation"),
      aiCall("conf-b", "adk_request_confirmation"),
      eventReply("evt-1", 0, "conf-a", JSON.stringify({ confirmed: true })),
      eventReply("evt-2", 0, "conf-b", UNREADABLE),
    ]);

    expect([...approvals.values()]).toEqual([
      { id: "conf-a", approved: true },
      { id: "conf-b" },
    ]);
  });

  /**
   * A reply ADK records nothing for does not raise, so its siblings in the same
   * event are parsed and resumed as usual and keep their decisions.
   */
  it("settles a sibling when the unrecorded reply came from the same event", () => {
    const { approvals } = projectAdkToolApprovals([
      aiCall("conf-a", "adk_request_confirmation"),
      aiCall("conf-b", "adk_request_confirmation"),
      eventReply("evt-1", 0, "conf-a", JSON.stringify({ confirmed: true })),
      eventReply("evt-1", 1, "conf-b", "false"),
    ]);

    expect([...approvals.values()]).toEqual([
      { id: "conf-a", approved: true },
      { id: "conf-b" },
    ]);
  });

  /**
   * ADK Python spells the confirmation args in snake_case, which the event
   * accumulator already reads both ways.
   */
  it("gates the call named by a snake_case confirmation request", () => {
    const { approvals } = projectAdkToolApprovals([
      aiCall(GATED_CALL, "delete_file", { path: "/tmp/a" }),
      aiCall(CONFIRMATION_CALL, "adk_request_confirmation", {
        original_function_call: { id: GATED_CALL, name: "delete_file" },
        tool_confirmation: { hint: "Delete /tmp/a?" },
      }),
    ]);

    expect([...approvals.keys()]).toEqual([CONFIRMATION_CALL, GATED_CALL]);
    expect(approvals.get(GATED_CALL)).toEqual({ id: CONFIRMATION_CALL });
  });

  it("gates nothing when no confirmation was requested", () => {
    const { approvals, key } = projectAdkToolApprovals([
      aiCall("tc-9", "search"),
    ]);
    expect(approvals.size).toBe(0);
    expect(key).toBe("");
  });
});

describe("toAdkToolConfirmationReply", () => {
  const pending = projectAdkToolApprovals(requestedThread()).approvals;

  it.each([
    [true, JSON.stringify({ confirmed: true })],
    [false, JSON.stringify({ confirmed: false })],
  ])(
    "serializes approved=%s as an ADK confirmation reply",
    (approved, content) => {
      expect(
        toAdkToolConfirmationReply(
          { approvalId: CONFIRMATION_CALL, approved, reason: "ignored" },
          pending,
        ),
      ).toMatchObject({
        type: "tool",
        tool_call_id: CONFIRMATION_CALL,
        name: "adk_request_confirmation",
        content,
        status: "success",
      });
    },
  );

  it.each([
    ["unknown", "no-such-id", pending],
    [
      "already settled",
      CONFIRMATION_CALL,
      projectAdkToolApprovals(
        requestedThread(reply(JSON.stringify({ confirmed: true }))),
      ).approvals,
    ],
  ])("rejects an approval id that is %s", (_name, approvalId, approvals) => {
    expect(() =>
      toAdkToolConfirmationReply({ approvalId, approved: true }, approvals),
    ).toThrow("No pending ADK tool confirmation");
  });

  it("still answers a gate whose earlier reply was unreadable", () => {
    const approvals = projectAdkToolApprovals(
      requestedThread(reply(JSON.stringify({ response: "not json" }))),
    ).approvals;

    expect(
      toAdkToolConfirmationReply(
        { approvalId: CONFIRMATION_CALL, approved: true },
        approvals,
      ),
    ).toMatchObject({
      tool_call_id: CONFIRMATION_CALL,
      content: JSON.stringify({ confirmed: true }),
    });
  });
});

describe("toAdkConfirmationReply", () => {
  it.each([
    [undefined, JSON.stringify({ confirmed: true })],
    [
      { note: "ok" },
      JSON.stringify({ confirmed: true, payload: { note: "ok" } }),
    ],
  ])(
    "preserves useAdkConfirmTool payload serialization: %s",
    (payload, content) => {
      expect(toAdkConfirmationReply(CONFIRMATION_CALL, true, payload)).toEqual({
        id: expect.any(String),
        type: "tool",
        tool_call_id: CONFIRMATION_CALL,
        name: "adk_request_confirmation",
        content,
        status: "success",
      });
    },
  );
});

describe("projectAdkToolApprovals gated call", () => {
  it("answers through the gated call with the synthetic id", () => {
    // ADK yields the gated call before the confirmation request, so it is in
    // the transcript too; answering from its control must still quote the id
    // ADK is waiting on.
    const { approvals } = projectAdkToolApprovals(requestedThread());

    const gated = approvals.get(GATED_CALL);
    expect(gated).toEqual({ id: CONFIRMATION_CALL });
    expect(
      toAdkToolConfirmationReply(
        { approvalId: gated!.id, approved: true },
        approvals,
      ),
    ).toMatchObject({
      tool_call_id: CONFIRMATION_CALL,
      name: "adk_request_confirmation",
      content: JSON.stringify({ confirmed: true }),
    });
  });

  it("leaves a confirmation whose original call has no id ungated", () => {
    const messages: AdkMessage[] = [
      aiCall(CONFIRMATION_CALL, "adk_request_confirmation", {
        toolConfirmation: { hint: "Delete /tmp/a?" },
      }),
    ];

    expect([...projectAdkToolApprovals(messages).approvals.keys()]).toEqual([
      CONFIRMATION_CALL,
    ]);
  });
});
