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
import { withRawResponseSchema } from "../interrupt-internals";

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

  it("gates a batch whose every tool call is rendered", () => {
    expect([
      ...projectAgUiToolApprovals(
        [gate("int-1", "tc-1"), gate("int-2", "tc-2")],
        new Set(["tc-1", "tc-2"]),
      ),
    ]).toEqual([
      ["tc-1", { id: "int-1" }],
      ["tc-2", { id: "int-2" }],
    ]);
  });

  it("leaves the whole batch bespoke when two gates name one tool call", () => {
    // One tool call renders one approval, so the second gate could never be
    // decided and `buildToolApprovalResume` would wait on it forever.
    const interrupts = [gate("int-1", "tc-1"), gate("int-2", "tc-1")];
    expect(projectAgUiToolApprovals(interrupts, new Set(["tc-1"])).size).toBe(
      0,
    );
    expect(projectAgUiToolApprovals(interrupts).size).toBe(0);
  });

  it("leaves the whole batch bespoke when a gate names an unrendered tool call", () => {
    // The unrendered gate could never be clicked, so the batch could never be
    // completed: its rendered sibling would take a decision that no resume
    // could carry.
    expect([
      ...projectAgUiToolApprovals(
        [gate("int-1", "tc-1"), gate("int-2", "tc-missing")],
        new Set(["tc-1"]),
      ),
    ]).toEqual([]);
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
      { type: "object", properties: { reason: { type: "number" } } },
      // A declared field the seam sends may not be narrowed past its type.
      { type: "object", properties: { approved: { const: true } } },
      { type: "object", properties: { approved: { enum: [true, false] } } },
      { type: "object", properties: { reason: { minLength: 1 } } },
      // Shapes a validator rejects as invalid: `properties` and a field schema
      // must each be the object a schema is read from.
      { type: "object", properties: 7 },
      { type: "object", properties: [] },
      { type: "object", properties: { approved: 7 } },
      { type: "object", properties: { editedArgs: 7 } },
      { type: "object", properties: { approved: { title: 42 } } },
      // A field the seam never sends still has to compile: a malformed schema
      // under it fails the run whatever payload follows.
      { type: "object", properties: { editedArgs: { type: 7 } } },
      { type: "object", properties: { editedArgs: { type: "bogus" } } },
      { type: "object", properties: { editedArgs: { required: [7] } } },
      { type: "object", properties: { editedArgs: { items: 7 } } },
      // The shapes the top-level schema is held to hold one level down too.
      { type: "object", properties: { editedArgs: { type: [] } } },
      { type: "object", properties: { editedArgs: { type: ["object", 7] } } },
      {
        type: "object",
        properties: { editedArgs: { type: ["object", "object"] } },
      },
      {
        type: "object",
        properties: { editedArgs: { required: ["path", "path"] } },
      },
      { type: "object", properties: { editedArgs: { title: 42 } } },
      { type: "object", properties: { editedArgs: { description: [] } } },
      { type: "object", properties: { editedArgs: { $schema: 7 } } },
      { type: "object", properties: { editedArgs: { $id: {} } } },
      {
        type: "object",
        properties: { editedArgs: { type: "object", properties: 7 } },
      },
      {
        type: "object",
        properties: {
          editedArgs: {
            type: "object",
            properties: { path: { type: "nonsense" } },
          },
        },
      },
    ];
    for (const responseSchema of unanswerable) {
      expect(
        projectAgUiToolApprovals([{ ...gate("int-1", "tc-1"), responseSchema }])
          .size,
      ).toBe(0);
    }
  });

  it("leaves a gate whose schema is not a plain object to the bespoke hooks, without throwing", () => {
    // `false` is a JSON Schema that rejects every payload, `true` and the rest
    // are not schemas this seam interprets; none may be boxed into an object or
    // crash the projection.
    const notObjects: unknown[] = [false, true, null, 0, 7, "object", []];
    for (const schema of notObjects) {
      // Live, a non-object schema arrives on the internal carrier.
      expect(
        projectAgUiToolApprovals([
          withRawResponseSchema(gate("int-1", "tc-1"), schema),
        ]).size,
      ).toBe(0);
      // A restored interrupt is untyped, so it can also sit on `responseSchema`.
      expect(
        projectAgUiToolApprovals([
          { ...gate("int-1", "tc-1"), responseSchema: schema } as AgUiInterrupt,
        ]).size,
      ).toBe(0);
    }
  });

  it("leaves a gate whose allowed keyword carries a malformed value to the bespoke hooks", () => {
    const malformed: Record<string, unknown>[] = [
      { type: ["object", 7] },
      { type: ["object", null] },
      { type: 7 },
      { required: ["approved", null, 7] },
      { required: 7 },
      // Shapes a JSON Schema validator rejects as an invalid schema: an
      // annotation that is not a string, an illegal type name, a duplicated
      // type entry, and a duplicated `required` entry.
      { title: 42 },
      { description: [] },
      { $schema: 7 },
      { $id: {} },
      { type: ["object", "bogus"] },
      { type: ["object", "object"] },
      { required: ["approved", "approved"] },
    ];
    for (const responseSchema of malformed) {
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
      // AG-UI's own minimal tool-approval schema, and its approve-with-edits
      // shape, whose `editedArgs` this seam simply never sends.
      {
        type: "object",
        properties: { approved: { type: "boolean" } },
        required: ["approved"],
      },
      {
        type: "object",
        properties: {
          approved: { type: "boolean" },
          editedArgs: {
            type: "object",
            description: "Full replacement of the tool args. Not merged.",
          },
        },
        required: ["approved"],
      },
      { type: "object", properties: {} },
      { type: "object", properties: { approved: {} } },
      {
        type: "object",
        properties: { approved: { type: ["boolean", "null"] } },
      },
      {
        type: "object",
        properties: {
          approved: { type: "boolean", description: "the decision" },
          reason: { type: "string" },
        },
      },
      { type: "object", properties: { editedArgs: false } },
      // A well-formed schema for a field the seam never sends stays answerable,
      // however it constrains that field and however deeply it nests.
      { type: "object", properties: { editedArgs: { type: "string" } } },
      {
        type: "object",
        properties: {
          editedArgs: {
            type: "object",
            required: ["path"],
            properties: { path: { type: ["string", "null"], minLength: 1 } },
          },
        },
      },
      {
        type: "object",
        properties: {
          editedArgs: { type: "array", items: { type: "object" } },
        },
      },
    ];
    for (const responseSchema of answerable) {
      expect([
        ...projectAgUiToolApprovals([
          { ...gate("int-1", "tc-1"), responseSchema },
        ]),
      ]).toEqual([["tc-1", { id: "int-1" }]]);
    }
  });

  it("leaves a gate whose schema is keyed by a prototype member to the bespoke hooks", () => {
    // Parsed from the wire so each key is an own property, as a server can send
    // it. Read off an object literal these would resolve to `Object.prototype`
    // members and either crash the projection or gate a schema nothing checked.
    for (const source of [
      '{"__proto__":{}}',
      '{"constructor":{}}',
      '{"toString":{}}',
      '{"hasOwnProperty":{}}',
      '{"valueOf":"object"}',
      '{"type":"object","toString":{}}',
    ]) {
      const responseSchema = JSON.parse(source) as Record<string, unknown>;
      expect(
        projectAgUiToolApprovals([{ ...gate("int-1", "tc-1"), responseSchema }])
          .size,
      ).toBe(0);
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

  it("answers and withholds a batch keyed by prototype-named interrupt ids", () => {
    // An interrupt id is a server-chosen string. Accumulated on an object
    // literal, `__proto__` would rewrite the prototype instead of recording a
    // response, and `constructor` or `toString` would read as answered while
    // still undecided.
    for (const id of ["__proto__", "constructor", "toString", "valueOf"]) {
      const batch = [gate(id, "tc-1"), gate("int-2", "tc-2")];
      expect(
        buildToolApprovalResume(
          [toolCall("tc-1", { id, approved: true }), toolCall("tc-2", {})],
          batch,
        ),
      ).toBeNull();
      expect(
        buildToolApprovalResume(
          [
            toolCall("tc-1", { id, approved: true }),
            toolCall("tc-2", { id: "int-2", approved: false }),
          ],
          batch,
        ),
      ).toEqual([
        { interruptId: id, status: "resolved", payload: { approved: true } },
        {
          interruptId: "int-2",
          status: "resolved",
          payload: { approved: false },
        },
      ]);
    }
  });

  it("withholds the resume while a prototype-named gate is undecided", () => {
    for (const id of ["__proto__", "constructor", "toString", "valueOf"]) {
      expect(
        buildToolApprovalResume([toolCall("tc-1", { id })], [gate(id, "tc-1")]),
      ).toBeNull();
    }
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

  it("closes an undecided gate whose resolved entry carries no decision", () => {
    const next = withSettledToolApprovals(
      [toolCall("tc-1", { id: "int-1" })],
      [{ interruptId: "int-1", status: "resolved", payload: { answer: 42 } }],
    );
    // No decision is fabricated, but the interrupt is closed, so leaving the
    // gate actionable would render a button with nothing left to answer.
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      resolution: "cancelled",
    });
  });

  it("clears a local decision the resolved entry that was sent did not carry", () => {
    const next = withSettledToolApprovals(
      [toolCall("tc-1", { id: "int-1", approved: true, reason: "sure" })],
      [{ interruptId: "int-1", status: "resolved", payload: { answer: 42 } }],
    );
    expect((next[0] as any).approval).toEqual({
      id: "int-1",
      resolution: "cancelled",
    });
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

  it("leaves a restored gate whose schema is not a plain object to the bespoke hooks", () => {
    // Persisted metadata is untyped, so the projection sees whatever was
    // stored; `null` must not reach `Object.keys`, and `false` must not be
    // boxed into an object that passes the allowlist.
    for (const responseSchema of [false, null, 7, "object"]) {
      const [message] = fromAgUiMessages([
        {
          id: "msg-1",
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: "tc-1",
              type: "function",
              function: { name: "delete_file", arguments: "{}" },
            },
          ],
          metadata: {
            custom: {
              agui: {
                interrupts: [{ ...gate("int-1", "tc-1"), responseSchema }],
              },
            },
          },
        },
      ]);

      const part = (message!.content as any[]).find(
        (p) => p.type === "tool-call",
      );
      expect(part.approval).toBeUndefined();
    }
  });

  it("leaves a restored gate whose object schema is malformed to the bespoke hooks", () => {
    for (const responseSchema of [
      { title: 42 },
      { description: [] },
      { type: ["object", "bogus"] },
      { required: ["approved", "approved"] },
    ]) {
      const [message] = fromAgUiMessages([
        {
          id: "msg-1",
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: "tc-1",
              type: "function",
              function: { name: "delete_file", arguments: "{}" },
            },
          ],
          metadata: {
            custom: {
              agui: {
                interrupts: [{ ...gate("int-1", "tc-1"), responseSchema }],
              },
            },
          },
        },
      ]);

      const part = (message!.content as any[]).find(
        (p) => p.type === "tool-call",
      );
      expect(part.approval).toBeUndefined();
    }
  });
});
