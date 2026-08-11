import { describe, expect, it } from "vitest";
import type { ThreadAssistantMessagePart } from "@assistant-ui/core";
import type { AgUiToolApproval } from "./tool-approval";
import {
  collectToolApprovalResume,
  findToolApprovalInterrupt,
  isToolApprovalInterrupt,
  projectAgUiToolApprovals,
  withClosedToolApprovals,
  withToolApprovalDecision,
} from "./tool-approval";
import type { AgUiInterrupt } from "../types";

const confirmation = (
  overrides: Partial<AgUiInterrupt> = {},
): AgUiInterrupt => ({
  id: "int-1",
  reason: "confirmation",
  toolCallId: "tc-1",
  message: "Delete /tmp/a?",
  ...overrides,
});

const toolCall = (
  toolCallId: string,
  approval?: AgUiToolApproval,
): ThreadAssistantMessagePart => ({
  type: "tool-call",
  toolCallId,
  toolName: "delete_file",
  args: {},
  argsText: "{}",
  ...(approval && { approval }),
});

const approvalOf = (content: readonly ThreadAssistantMessagePart[], i = 0) => {
  const part = content[i];
  return part?.type === "tool-call" ? part.approval : undefined;
};

describe("isToolApprovalInterrupt", () => {
  it("accepts a confirmation that names its tool call", () => {
    expect(isToolApprovalInterrupt(confirmation())).toBe(true);
  });

  it("rejects a reason that is not a confirmation", () => {
    expect(
      isToolApprovalInterrupt(confirmation({ reason: "input_required" })),
    ).toBe(false);
  });

  it("rejects a confirmation with no tool call to gate", () => {
    const { toolCallId: _omitted, ...withoutToolCall } = confirmation();
    expect(isToolApprovalInterrupt(withoutToolCall)).toBe(false);
    expect(isToolApprovalInterrupt(confirmation({ toolCallId: "" }))).toBe(
      false,
    );
  });

  it("does not throw on a malformed interrupt", () => {
    expect(isToolApprovalInterrupt(undefined)).toBe(false);
    expect(
      isToolApprovalInterrupt({ reason: "confirmation" } as AgUiInterrupt),
    ).toBe(false);
  });
});

describe("projectAgUiToolApprovals", () => {
  it("opens a gate keyed by the gated tool call, carrying the interrupt id", () => {
    expect(projectAgUiToolApprovals([confirmation()]).get("tc-1")).toEqual({
      id: "int-1",
    });
  });

  it("gates only the confirmations, leaving other interrupts alone", () => {
    const approvals = projectAgUiToolApprovals([
      confirmation(),
      confirmation({
        id: "int-2",
        reason: "input_required",
        toolCallId: "tc-2",
      }),
    ]);
    expect([...approvals.keys()]).toEqual(["tc-1"]);
  });

  it("is empty when there are no interrupts", () => {
    expect(projectAgUiToolApprovals(undefined).size).toBe(0);
    expect(projectAgUiToolApprovals([]).size).toBe(0);
  });

  it("does not throw on malformed interrupts", () => {
    expect(() =>
      projectAgUiToolApprovals([
        undefined as unknown as AgUiInterrupt,
        { reason: "confirmation" } as AgUiInterrupt,
      ]),
    ).not.toThrow();
  });
});

describe("findToolApprovalInterrupt", () => {
  it("finds the confirmation an approval id addresses", () => {
    expect(findToolApprovalInterrupt([confirmation()], "int-1")?.id).toBe(
      "int-1",
    );
  });

  it("returns nothing for a stale approval id", () => {
    expect(
      findToolApprovalInterrupt([confirmation()], "int-9"),
    ).toBeUndefined();
  });

  it("returns nothing for an interrupt that is not a tool gate", () => {
    expect(
      findToolApprovalInterrupt(
        [confirmation({ reason: "input_required" })],
        "int-1",
      ),
    ).toBeUndefined();
  });
});

describe("withToolApprovalDecision", () => {
  const content = [toolCall("tc-1", { id: "int-1" })];

  it("records an approval on the gated part", () => {
    const next = withToolApprovalDecision(content, {
      approvalId: "int-1",
      approved: true,
    });
    expect(approvalOf(next)).toEqual({ id: "int-1", approved: true });
  });

  it("records a denial with its reason, which has no wire field", () => {
    const next = withToolApprovalDecision(content, {
      approvalId: "int-1",
      approved: false,
      reason: "too risky",
    });
    expect(approvalOf(next)).toEqual({
      id: "int-1",
      approved: false,
      reason: "too risky",
    });
  });

  it("leaves the content untouched for a stale approval id", () => {
    expect(
      withToolApprovalDecision(content, {
        approvalId: "int-9",
        approved: true,
      }),
    ).toBe(content);
  });

  it("leaves an already decided gate untouched", () => {
    const decided = [toolCall("tc-1", { id: "int-1", approved: true })];
    expect(
      withToolApprovalDecision(decided, {
        approvalId: "int-1",
        approved: false,
      }),
    ).toBe(decided);
  });
});

describe("withClosedToolApprovals", () => {
  it("closes an undecided gate as cancelled", () => {
    const next = withClosedToolApprovals([toolCall("tc-1", { id: "int-1" })]);
    expect(approvalOf(next)).toEqual({ id: "int-1", resolution: "cancelled" });
  });

  it("keeps a decided gate as it was", () => {
    const decided = [toolCall("tc-1", { id: "int-1", approved: false })];
    expect(withClosedToolApprovals(decided)).toBe(decided);
  });

  it("leaves ungated tool calls alone", () => {
    const ungated = [toolCall("tc-1")];
    expect(withClosedToolApprovals(ungated)).toBe(ungated);
  });
});

describe("collectToolApprovalResume", () => {
  it("resumes the run for an approval", () => {
    expect(
      collectToolApprovalResume(
        [toolCall("tc-1", { id: "int-1", approved: true })],
        [confirmation()],
      ),
    ).toEqual([{ interruptId: "int-1", status: "resolved" }]);
  });

  it("cancels the interrupt for a denial, the only refusal AG-UI can express", () => {
    expect(
      collectToolApprovalResume(
        [toolCall("tc-1", { id: "int-1", approved: false, reason: "no" })],
        [confirmation()],
      ),
    ).toEqual([{ interruptId: "int-1", status: "cancelled" }]);
  });

  it("waits while another gate in the batch is undecided", () => {
    expect(
      collectToolApprovalResume(
        [
          toolCall("tc-1", { id: "int-1", approved: true }),
          toolCall("tc-2", { id: "int-2" }),
        ],
        [confirmation(), confirmation({ id: "int-2", toolCallId: "tc-2" })],
      ),
    ).toBeNull();
  });

  it("answers a fully decided batch in interrupt order", () => {
    expect(
      collectToolApprovalResume(
        [
          toolCall("tc-1", { id: "int-1", approved: true }),
          toolCall("tc-2", { id: "int-2", approved: false }),
        ],
        [confirmation(), confirmation({ id: "int-2", toolCallId: "tc-2" })],
      ),
    ).toEqual([
      { interruptId: "int-1", status: "resolved" },
      { interruptId: "int-2", status: "cancelled" },
    ]);
  });

  it("waits when the batch holds an interrupt the seam cannot answer", () => {
    expect(
      collectToolApprovalResume(
        [toolCall("tc-1", { id: "int-1", approved: true })],
        [
          confirmation(),
          confirmation({
            id: "int-2",
            reason: "input_required",
            toolCallId: "tc-2",
          }),
        ],
      ),
    ).toBeNull();
  });

  it("does not throw on malformed content or interrupts", () => {
    expect(() =>
      collectToolApprovalResume(
        [{ type: "text", text: "hi" }, toolCall("tc-1")],
        [undefined as unknown as AgUiInterrupt],
      ),
    ).not.toThrow();
  });
});
