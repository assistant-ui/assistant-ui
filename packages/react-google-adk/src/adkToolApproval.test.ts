import { describe, expect, it } from "vitest";
import {
  adkToolApprovalsKey,
  projectAdkToolApprovals,
  toAdkConfirmationReply,
  toAdkToolConfirmationReply,
} from "./adkToolApproval";
import type { AdkMessage, AdkToolConfirmation } from "./types";

const confirmation = (
  overrides: Partial<AdkToolConfirmation> = {},
): AdkToolConfirmation => ({
  toolCallId: "tc-1",
  toolName: "delete_file",
  args: { path: "/tmp/a" },
  hint: "Delete /tmp/a?",
  confirmed: false,
  ...overrides,
});

const aiWithToolCall = (toolCallId: string, name: string): AdkMessage => ({
  id: "ai-1",
  type: "ai",
  content: [],
  tool_calls: [{ id: toolCallId, name, args: {}, argsText: "{}" }],
});

const toolReply = (
  toolCallId: string,
  name: string,
  content: string,
): AdkMessage => ({
  id: `tool-${toolCallId}`,
  type: "tool",
  tool_call_id: toolCallId,
  name,
  content,
  status: "success",
});

describe("projectAdkToolApprovals", () => {
  it("opens an approval gate for a pending confirmation", () => {
    const approvals = projectAdkToolApprovals(
      [aiWithToolCall("tc-1", "adk_request_confirmation")],
      [confirmation()],
    );
    expect(approvals.get("tc-1")).toEqual({ id: "tc-1" });
  });

  it("returns no approvals when there are no confirmations", () => {
    const approvals = projectAdkToolApprovals(
      [aiWithToolCall("tc-1", "delete_file")],
      [],
    );
    expect(approvals.size).toBe(0);
  });

  it("settles an approved confirmation from its reply", () => {
    const approvals = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "adk_request_confirmation"),
        toolReply(
          "tc-1",
          "adk_request_confirmation",
          JSON.stringify({ confirmed: true }),
        ),
      ],
      [confirmation()],
    );
    expect(approvals.get("tc-1")).toEqual({ id: "tc-1", approved: true });
  });

  it("settles a denied confirmation from its reply", () => {
    const approvals = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "adk_request_confirmation"),
        toolReply(
          "tc-1",
          "adk_request_confirmation",
          JSON.stringify({ confirmed: false }),
        ),
      ],
      [confirmation()],
    );
    expect(approvals.get("tc-1")).toEqual({ id: "tc-1", approved: false });
  });

  it("settles a confirmation the snapshot already records as confirmed", () => {
    const approvals = projectAdkToolApprovals(
      [aiWithToolCall("tc-1", "adk_request_confirmation")],
      [confirmation({ confirmed: true })],
    );
    expect(approvals.get("tc-1")).toEqual({ id: "tc-1", approved: true });
  });

  it("records a gate closed by some other result as cancelled", () => {
    const approvals = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "delete_file"),
        toolReply("tc-1", "delete_file", JSON.stringify({ deleted: true })),
      ],
      [confirmation()],
    );
    expect(approvals.get("tc-1")).toEqual({
      id: "tc-1",
      resolution: "cancelled",
    });
  });

  it("prefers the confirmation reply over a later tool result", () => {
    const approvals = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "delete_file"),
        toolReply(
          "tc-1",
          "adk_request_confirmation",
          JSON.stringify({ confirmed: true }),
        ),
        toolReply("tc-1", "delete_file", JSON.stringify({ deleted: true })),
      ],
      [confirmation()],
    );
    expect(approvals.get("tc-1")).toEqual({ id: "tc-1", approved: true });
  });

  it("records an unreadable confirmation reply as cancelled rather than a decision", () => {
    const approvals = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "adk_request_confirmation"),
        toolReply("tc-1", "adk_request_confirmation", "not json"),
      ],
      [confirmation()],
    );
    expect(approvals.get("tc-1")).toEqual({
      id: "tc-1",
      resolution: "cancelled",
    });
  });

  it("skips confirmations without a usable tool call id", () => {
    const approvals = projectAdkToolApprovals(
      [],
      [
        confirmation({ toolCallId: "" }),
        confirmation({ toolCallId: undefined as unknown as string }),
      ],
    );
    expect(approvals.size).toBe(0);
  });

  it("does not throw on malformed messages or confirmations", () => {
    expect(() =>
      projectAdkToolApprovals(
        [undefined as unknown as AdkMessage, { type: "tool" } as AdkMessage],
        [
          undefined as unknown as AdkToolConfirmation,
          confirmation({ confirmed: undefined as unknown as boolean }),
        ],
      ),
    ).not.toThrow();
  });
});

describe("adkToolApprovalsKey", () => {
  it("is empty when nothing is gated", () => {
    expect(adkToolApprovalsKey(new Map())).toBe("");
  });

  it("changes when a gate settles", () => {
    const pending = projectAdkToolApprovals(
      [aiWithToolCall("tc-1", "adk_request_confirmation")],
      [confirmation()],
    );
    const settled = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "adk_request_confirmation"),
        toolReply(
          "tc-1",
          "adk_request_confirmation",
          JSON.stringify({ confirmed: true }),
        ),
      ],
      [confirmation()],
    );
    expect(adkToolApprovalsKey(pending)).not.toBe(adkToolApprovalsKey(settled));
  });
});

describe("toAdkToolConfirmationReply", () => {
  const pending = projectAdkToolApprovals(
    [aiWithToolCall("tc-1", "adk_request_confirmation")],
    [confirmation()],
  );

  it("maps an approval onto a confirming ADK reply", () => {
    const reply = toAdkToolConfirmationReply(
      { approvalId: "tc-1", approved: true },
      pending,
    );
    expect(reply).toMatchObject({
      type: "tool",
      tool_call_id: "tc-1",
      name: "adk_request_confirmation",
      status: "success",
    });
    expect(JSON.parse(reply.content)).toEqual({ confirmed: true });
  });

  it("maps a denial onto a rejecting ADK reply", () => {
    const reply = toAdkToolConfirmationReply(
      { approvalId: "tc-1", approved: false },
      pending,
    );
    expect(JSON.parse(reply.content)).toEqual({ confirmed: false });
  });

  it("carries no reason, since ADK confirmations have no field for one", () => {
    const reply = toAdkToolConfirmationReply(
      { approvalId: "tc-1", approved: false, reason: "too risky" },
      pending,
    );
    expect(JSON.parse(reply.content)).toEqual({ confirmed: false });
  });

  it("throws for an approval id with no pending confirmation", () => {
    expect(() =>
      toAdkToolConfirmationReply(
        { approvalId: "tc-9", approved: true },
        pending,
      ),
    ).toThrow('No pending ADK tool confirmation for approval id "tc-9"');
  });

  it("throws for an approval that already settled", () => {
    const settled = projectAdkToolApprovals(
      [
        aiWithToolCall("tc-1", "adk_request_confirmation"),
        toolReply(
          "tc-1",
          "adk_request_confirmation",
          JSON.stringify({ confirmed: true }),
        ),
      ],
      [confirmation()],
    );
    expect(() =>
      toAdkToolConfirmationReply(
        { approvalId: "tc-1", approved: false },
        settled,
      ),
    ).toThrow("No pending ADK tool confirmation");
  });
});

describe("toAdkConfirmationReply", () => {
  it("includes a payload when one is supplied", () => {
    const reply = toAdkConfirmationReply("tc-1", true, { scope: "session" });
    expect(JSON.parse(reply.content)).toEqual({
      confirmed: true,
      payload: { scope: "session" },
    });
  });

  it("omits the payload key when none is supplied", () => {
    const reply = toAdkConfirmationReply("tc-1", true);
    expect(JSON.parse(reply.content)).toEqual({ confirmed: true });
  });
});
