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
    [
      "still pending on an unreadable reply",
      requestedThread(reply("not json")),
      { id: CONFIRMATION_CALL },
    ],
    [
      "still pending on an unreadable wrapped reply",
      requestedThread(reply(JSON.stringify({ response: "not json" }))),
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
    "projects only the synthetic confirmation call: %s",
    (_name, messages, expected) => {
      const { approvals, key } = projectAdkToolApprovals(messages);
      expect([...approvals.keys()]).toEqual([CONFIRMATION_CALL]);
      expect(approvals.get(CONFIRMATION_CALL)).toEqual(expected);
      expect(key).not.toBe("");
    },
  );

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
      requestedThread(reply("not json")),
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
