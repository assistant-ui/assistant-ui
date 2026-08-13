import { describe, it, expect } from "vitest";
import type { ThreadAssistantMessagePart } from "@assistant-ui/core";
import { fromAgUiMessages } from "./conversions";
import {
  buildToolApprovalResume,
  projectAgUiToolApprovals,
  withSettledToolApprovals,
  withToolApprovalDecision,
} from "./tool-approval";
import type { AgUiInterrupt, AgUiResumeEntry } from "../types";

const gate = (id: string, toolCallId: string): AgUiInterrupt => ({
  id,
  reason: "tool_call",
  toolCallId,
});

const toolCall = (
  toolCallId: string,
  approval?: Record<string, unknown>,
): ThreadAssistantMessagePart =>
  ({
    type: "tool-call",
    toolCallId,
    toolName: "delete_file",
    args: {},
    argsText: "{}",
    ...(approval ? { approval } : {}),
  }) as ThreadAssistantMessagePart;

describe("projectAgUiToolApprovals", () => {
  it("gates the named tool call for a tool_call interrupt", () => {
    expect([...projectAgUiToolApprovals([gate("int-1", "tc-1")])]).toEqual([
      ["tc-1", { id: "int-1" }],
    ]);
  });

  it("leaves free-standing confirmation and input_required to the bespoke hooks", () => {
    const interrupts: AgUiInterrupt[] = [
      { id: "int-1", reason: "confirmation" },
      { id: "int-2", reason: "input_required", toolCallId: "tc-2" },
      { id: "int-3", reason: "tool_call" },
    ];
    for (const interrupt of interrupts) {
      expect(projectAgUiToolApprovals([interrupt]).size).toBe(0);
    }
  });

  it("projects nothing for a batch that mixes a gate with another interrupt", () => {
    expect(
      projectAgUiToolApprovals([
        gate("int-1", "tc-1"),
        { id: "int-2", reason: "input_required" },
      ]).size,
    ).toBe(0);
  });

  it("leaves a gate to the bespoke hooks unless the schema is known to accept a decision", () => {
    const unanswerable: Record<string, unknown>[] = [
      { type: "object", required: ["approved", "auditCode"] },
      { required: ["auditCode"] },
      { required: "approved" },
      { type: "string" },
      { type: ["string", "number"] },
      // Keywords the seam does not interpret, each of which can reject a
      // payload the seam emits.
      { type: "object", allOf: [{ required: ["auditCode"] }] },
      {
        type: "object",
        $ref: "#/$defs/audited",
        $defs: { audited: { required: ["auditCode"] } },
      },
      { type: "object", additionalProperties: { type: "number" } },
      {
        type: "object",
        additionalProperties: false,
        properties: { approved: { type: "boolean" } },
      },
      {
        type: "object",
        additionalProperties: false,
        properties: { decision: { type: "boolean" } },
      },
      { type: "object", properties: { approved: { type: "string" } } },
      { type: "object", properties: { reason: { type: "string" } } },
    ];
    for (const responseSchema of unanswerable) {
      expect(
        projectAgUiToolApprovals([{ ...gate("int-1", "tc-1"), responseSchema }])
          .size,
      ).toBe(0);
    }
  });

  it("gates a schema built only from keywords that accept every payload the seam emits", () => {
    const answerable: Record<string, unknown>[] = [
      { type: "object" },
      { type: ["object"] },
      { type: ["object", "null"] },
      { type: "object", required: ["approved"] },
      { type: "object", required: [] },
      { required: ["approved"] },
      { title: "Decision", description: "approve or deny", type: "object" },
    ];
    for (const responseSchema of answerable) {
      expect([
        ...projectAgUiToolApprovals([
          { ...gate("int-1", "tc-1"), responseSchema },
        ]),
      ]).toEqual([["tc-1", { id: "int-1" }]]);
    }
  });
});

describe("buildToolApprovalResume", () => {
  const interrupts = [gate("int-1", "tc-1"), gate("int-2", "tc-2")];

  it("returns null until every gate in the batch is decided", () => {
    const content = [
      toolCall("tc-1", { id: "int-1", approved: true }),
      toolCall("tc-2", { id: "int-2" }),
    ];
    expect(buildToolApprovalResume(content, interrupts)).toBeNull();
  });

  it("maps approve and deny onto resolved payloads, keeping the denial reason", () => {
    const content = [
      toolCall("tc-1", { id: "int-1", approved: true }),
      toolCall("tc-2", { id: "int-2", approved: false, reason: "too risky" }),
    ];
    expect(buildToolApprovalResume(content, interrupts)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
      {
        interruptId: "int-2",
        status: "resolved",
        payload: { approved: false, reason: "too risky" },
      },
    ]);
  });

  it("sends only the decision, never an option the wire cannot validate", () => {
    const content = [
      toolCall("tc-1", {
        id: "int-1",
        approved: true,
        optionId: "allow-always",
      }),
      toolCall("tc-2", { id: "int-2", approved: false }),
    ];
    expect(buildToolApprovalResume(content, interrupts)).toEqual([
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
      {
        interruptId: "int-2",
        status: "resolved",
        payload: { approved: false },
      },
    ]);
  });
});

describe("withToolApprovalDecision", () => {
  it("records the decision on the gate it addresses and leaves the rest alone", () => {
    const content = [
      toolCall("tc-1", { id: "int-1" }),
      toolCall("tc-2", { id: "int-2" }),
    ];
    const next = withToolApprovalDecision(content, {
      approvalId: "int-1",
      approved: false,
      reason: "no",
    });
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      approved: false,
      reason: "no",
    });
    expect(next[1]).toBe(content[1]);
    expect(
      withToolApprovalDecision(next, { approvalId: "int-1", approved: true }),
    ).toBe(next);
  });

  it("records the decision alone, since the projected approval carries no options", () => {
    const next = withToolApprovalDecision([toolCall("tc-1", { id: "int-1" })], {
      approvalId: "int-1",
      approved: true,
      optionId: "allow-always",
    });
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      approved: true,
    });
  });
});

describe("withSettledToolApprovals", () => {
  it("cancels only the gate whose own entry is cancelled", () => {
    const content = [
      toolCall("tc-1", { id: "int-1" }),
      toolCall("tc-2", { id: "int-2" }),
    ];
    const next = withSettledToolApprovals(content, [
      { interruptId: "int-1", status: "resolved", payload: { approved: true } },
      { interruptId: "int-2", status: "cancelled" },
    ]);
    expect((next[0] as any).approval).toEqual({ id: "int-1", approved: true });
    expect((next[1] as any).approval).toEqual({
      id: "int-2",
      resolution: "cancelled",
    });
  });

  it("overrides a locally recorded decision the submitted entry contradicts", () => {
    const content = [
      toolCall("tc-1", { id: "int-1", approved: true }),
      toolCall("tc-2", { id: "int-2" }),
    ];
    const next = withSettledToolApprovals(content, [
      { interruptId: "int-1", status: "cancelled" },
      { interruptId: "int-2", status: "cancelled" },
    ]);
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      resolution: "cancelled",
    });
    expect((next[1] as any).approval).toEqual({
      id: "int-2",
      resolution: "cancelled",
    });
  });

  it("settles repeatedly in either order, always showing the latest entry", () => {
    const cancelled = [
      { interruptId: "int-1", status: "cancelled" },
    ] as const satisfies readonly AgUiResumeEntry[];
    const resolved = [
      {
        interruptId: "int-1",
        status: "resolved",
        payload: { approved: true },
      },
    ] as const satisfies readonly AgUiResumeEntry[];
    const pending = [toolCall("tc-1", { id: "int-1" })];

    const cancelledThenResolved = withSettledToolApprovals(
      withSettledToolApprovals(pending, cancelled),
      resolved,
    );
    const resolvedThenCancelled = withSettledToolApprovals(
      withSettledToolApprovals(pending, resolved),
      cancelled,
    );

    expect((cancelledThenResolved[0] as any).approval).toEqual({
      id: "int-1",
      approved: true,
    });
    expect((resolvedThenCancelled[0] as any).approval).toEqual({
      id: "int-1",
      resolution: "cancelled",
    });
  });

  it("adopts the decision a resolved entry carries", () => {
    const next = withSettledToolApprovals(
      [toolCall("tc-1", { id: "int-1" })],
      [
        {
          interruptId: "int-1",
          status: "resolved",
          payload: { approved: false, reason: "denied elsewhere" },
        },
      ],
    );
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      approved: false,
      reason: "denied elsewhere",
    });
  });

  it("drops local decision metadata the resolved payload does not carry", () => {
    const next = withSettledToolApprovals(
      [
        toolCall("tc-1", {
          id: "int-1",
          approved: false,
          reason: "local denial",
        }),
      ],
      [
        {
          interruptId: "int-1",
          status: "resolved",
          payload: { approved: true },
        },
      ],
    );
    expect((next[0] as any).approval).toEqual({ id: "int-1", approved: true });
  });

  it("ignores an option a resolved entry carries, which the approval has no options to name", () => {
    const next = withSettledToolApprovals(
      [toolCall("tc-1", { id: "int-1" })],
      [
        {
          interruptId: "int-1",
          status: "resolved",
          payload: { approved: true, optionId: "allow-always" },
        },
      ],
    );
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      approved: true,
    });
  });

  it("leaves a gate untouched when its resolved entry carries no decision", () => {
    const content = [toolCall("tc-1", { id: "int-1" })];
    expect(
      withSettledToolApprovals(content, [
        { interruptId: "int-1", status: "resolved", payload: { answer: 42 } },
      ]),
    ).toBe(content);
  });
});

describe("restored snapshots", () => {
  it("exposes the approval seam on a tool call restored from history", () => {
    const [message] = fromAgUiMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tc-1",
            type: "function",
            function: { name: "delete_file", arguments: '{"path":"/tmp/a"}' },
          },
        ],
        metadata: {
          custom: { agui: { interrupts: [gate("int-1", "tc-1")] } },
        },
      },
    ]);

    const part = (message!.content as any[]).find(
      (p) => p.type === "tool-call",
    );
    expect(part.approval).toEqual({ id: "int-1" });
    expect(message!.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
  });
});
