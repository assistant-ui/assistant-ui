import { describe, expect, it, vi } from "vitest";
import {
  getPartialJsonObjectFieldState,
  type ReadonlyJSONObject,
} from "assistant-stream/utils";
import {
  AISDKMessageConverter,
  type AISDKMessageConverterMetadata,
} from "./convertMessage";

const { stableStringifySpy } = vi.hoisted(() => ({
  stableStringifySpy: vi.fn(),
}));
vi.mock("@assistant-ui/core/internal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/internal")>();
  stableStringifySpy.mockImplementation(actual.stableStringifyToolArgs);
  return { ...actual, stableStringifyToolArgs: stableStringifySpy };
});

describe("AISDKMessageConverter", () => {
  it("flags the streaming assistant message as optimistic", () => {
    const metadata: AISDKMessageConverterMetadata = {
      optimisticMessageId: "a1",
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
        { id: "a1", role: "assistant", parts: [{ type: "text", text: "yo" }] },
      ] as any,
      true,
      metadata,
    );

    expect(converted[0]?.metadata.isOptimistic).toBeFalsy();
    expect(converted[1]?.metadata.isOptimistic).toBe(true);
  });

  it("keeps metadata outside the thread shape reachable under custom", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "yo" }],
        metadata: {
          usage: { inputTokens: 40, outputTokens: 2 },
          modelId: "gpt-6-luna",
          custom: { source: "route" },
        },
      },
    ] as any);

    expect(converted[0]?.metadata.custom).toEqual({
      usage: { inputTokens: 40, outputTokens: 2 },
      modelId: "gpt-6-luna",
      source: "route",
    });
    expect(converted[0]?.metadata).not.toHaveProperty("usage");
  });

  it("preserves prototype-named custom metadata", () => {
    const metadata = JSON.parse(
      '{"__proto__":{"source":"server"},"constructor":"model"}',
    );
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "yo" }],
        metadata,
      },
    ] as any);
    const custom = converted[0]?.metadata.custom;

    expect(Object.hasOwn(custom!, "__proto__")).toBe(true);
    expect(custom!["__proto__"]).toEqual({ source: "server" });
    expect(custom!["constructor"]).toBe("model");
  });

  it("keeps modality metadata at the top level", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "yo" }],
        metadata: { modality: "voice" },
      },
    ] as any);

    expect(converted[0]?.metadata.modality).toBe("voice");
    expect(converted[0]?.metadata.custom).not.toHaveProperty("modality");
  });

  it("does not flag messages when no optimistic id is provided", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "yo" }] },
    ] as any);

    expect(converted[0]?.metadata.isOptimistic).toBeFalsy();
  });

  it("converts user files into attachments and keeps text content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "u1",
        role: "user",
        parts: [
          { type: "text", text: "hello" },
          {
            type: "file",
            mediaType: "image/png",
            url: "https://cdn/img.png",
            filename: "img.png",
          },
          {
            type: "file",
            mediaType: "application/pdf",
            url: "https://cdn/file.pdf",
            filename: "file.pdf",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("user");
    expect(converted[0]?.content).toHaveLength(1);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "hello",
    });
    expect(converted[0]?.attachments).toHaveLength(2);
    expect(converted[0]?.attachments?.[0]?.type).toBe("image");
    expect(converted[0]?.attachments?.[1]?.type).toBe("file");
  });

  it("degrades a user file part missing mediaType instead of throwing", () => {
    const convert = () =>
      AISDKMessageConverter.toThreadMessages([
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "file",
              url: "https://cdn/file.bin",
              filename: "file.bin",
            },
          ],
        } as any,
      ]);

    expect(convert).not.toThrow();
    const attachment = convert()[0]?.attachments?.[0];
    expect(attachment?.type).toBe("file");
    expect(attachment?.contentType).toBe("unknown/unknown");
    expect(attachment?.content[0]).toMatchObject({
      type: "file",
      mimeType: "unknown/unknown",
    });
  });

  it("converts source-document parts into document sources", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "source-document",
            sourceId: "doc_123",
            title: "proposal.pdf",
            mediaType: "application/pdf",
            filename: "proposal.pdf",
            providerMetadata: {
              openai: {
                type: "file_citation",
                fileId: "file_123",
                index: 0,
              },
            },
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("assistant");

    const sourcePart = converted[0]?.content.find(
      (part): part is any => part.type === "source",
    );

    expect(sourcePart).toMatchObject({
      type: "source",
      sourceType: "document",
      id: "doc_123",
      title: "proposal.pdf",
      mediaType: "application/pdf",
      filename: "proposal.pdf",
      providerMetadata: {
        openai: {
          type: "file_citation",
          fileId: "file_123",
          index: 0,
        },
      },
    });
  });

  it("converts source-url parts without synthesizing missing optional fields", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "source-url",
            sourceId: "url_123",
            url: "https://example.com/report",
            providerMetadata: {
              openai: {
                type: "url_citation",
                index: 1,
              },
            },
          },
        ],
      } as any,
    ]);

    const sourcePart = converted[0]?.content.find(
      (part): part is any => part.type === "source",
    );

    expect(sourcePart).toMatchObject({
      type: "source",
      sourceType: "url",
      id: "url_123",
      url: "https://example.com/report",
      providerMetadata: {
        openai: {
          type: "url_citation",
          index: 1,
        },
      },
    });
    expect(sourcePart).not.toHaveProperty("title");
  });

  it("converts assistant image file parts into file content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Here is the image" },
          {
            type: "file",
            mediaType: "image/png",
            url: "https://cdn/generated.png",
            filename: "generated.png",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("assistant");
    expect(converted[0]?.content).toHaveLength(2);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "Here is the image",
    });
    expect(converted[0]?.content[1]).toMatchObject({
      type: "file",
      data: "https://cdn/generated.png",
      mimeType: "image/png",
      filename: "generated.png",
    });
  });

  it("converts assistant non-image file parts into file content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Here is the PDF" },
          {
            type: "file",
            mediaType: "application/pdf",
            url: "data:application/pdf;base64,abc123",
            filename: "report.pdf",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("assistant");
    expect(converted[0]?.content).toHaveLength(2);
    expect(converted[0]?.content[1]).toMatchObject({
      type: "file",
      data: "data:application/pdf;base64,abc123",
      mimeType: "application/pdf",
      filename: "report.pdf",
    });
  });

  it("deduplicates tool calls by toolCallId and surfaces approval / interrupt state", () => {
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 72 },
            },
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 73 },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-2",
              state: "approval-requested",
              input: { action: "deploy" },
              approval: { id: "appr-1" },
            },
            {
              type: "tool-human",
              toolCallId: "tc-3",
              state: "input-available",
              input: { task: "confirm" },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-4",
              state: "approval-responded",
              input: { action: "rollback" },
              approval: { id: "appr-2", approved: true, reason: "looks ok" },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-5",
              state: "approval-requested",
              input: { action: "auto" },
              approval: { id: "appr-3", isAutomatic: true },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-6",
              state: "output-denied",
              input: { action: "wipe" },
              approval: {
                id: "appr-4",
                approved: false,
                reason: "user denied",
              },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-7",
              state: "output-available",
              input: { action: "ship" },
              output: { ok: true },
              approval: { id: "appr-5", approved: true, isAutomatic: true },
            },
          ],
        } as any,
      ],
      false,
      {
        toolStatuses: {
          "tc-3": {
            type: "interrupt",
            payload: { type: "human", payload: { kind: "human" } },
          },
        },
      },
    );

    const toolCalls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCalls).toHaveLength(7);

    expect(toolCalls?.filter((p) => p.toolCallId === "tc-1")).toHaveLength(1);

    expect(toolCalls?.find((p) => p.toolCallId === "tc-2")?.approval).toEqual({
      id: "appr-1",
    });
    expect(
      toolCalls?.find((p) => p.toolCallId === "tc-2")?.interrupt,
    ).toBeUndefined();

    expect(toolCalls?.find((p) => p.toolCallId === "tc-3")?.interrupt).toEqual({
      type: "human",
      payload: { kind: "human" },
    });
    expect(
      toolCalls?.find((p) => p.toolCallId === "tc-3")?.approval,
    ).toBeUndefined();

    expect(toolCalls?.find((p) => p.toolCallId === "tc-4")?.approval).toEqual({
      id: "appr-2",
      approved: true,
      reason: "looks ok",
    });

    expect(toolCalls?.find((p) => p.toolCallId === "tc-5")?.approval).toEqual({
      id: "appr-3",
      isAutomatic: true,
    });

    const denied = toolCalls?.find((p) => p.toolCallId === "tc-6");
    expect(denied?.approval).toEqual({
      id: "appr-4",
      approved: false,
      reason: "user denied",
    });
    expect(denied?.isError).toBe(true);

    expect(toolCalls?.find((p) => p.toolCallId === "tc-7")?.approval).toEqual({
      id: "appr-5",
      approved: true,
      isAutomatic: true,
    });
  });

  it("preserves producer-defined approval fields and gives prompt precedence", () => {
    const descriptor = { scope: "account:deploy" };
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-deploy",
            toolCallId: "tc-1",
            state: "approval-responded",
            input: { environment: "production" },
            approval: {
              id: "approval-1",
              approved: true,
              reason: "approved by operator",
              prompt: "Deploy to production?",
              descriptor,
              requestReason: "Production access requires approval",
              signature: "signed-approval",
              futureField: "preserved",
            },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({
      id: "approval-1",
      approved: true,
      reason: "approved by operator",
      prompt: "Deploy to production?",
      descriptor,
      requestReason: "Production access requires approval",
      signature: "signed-approval",
      futureField: "preserved",
    });
  });

  it("drops fields the AI SDK cannot answer and uses requestReason as the prompt", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-deploy",
            toolCallId: "tc-1",
            state: "approval-requested",
            input: {},
            approval: {
              id: "approval-1",
              display: "select",
              allowFreeform: true,
              options: [{ id: "once", kind: "allow-once" }],
              optionId: "once",
              text: "an answer",
              resolution: "cancelled",
              requestReason: "kept",
            },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({
      id: "approval-1",
      prompt: "kept",
      resolution: "cancelled",
      requestReason: "kept",
    });
  });

  it("preserves rich approval fields for a custom response channel", () => {
    const metadata: AISDKMessageConverterMetadata = {
      supportsRichToolApprovalResponses: true,
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tc-1",
              state: "approval-responded",
              input: {},
              approval: {
                id: "approval-1",
                display: "select",
                allowFreeform: true,
                options: [
                  {
                    id: "once",
                    kind: "allow-once",
                    label: "Only once",
                    grants: ["repository", 42],
                    confirm: {
                      title: "Confirm access",
                      description: { invalid: true },
                    },
                  },
                  "invalid",
                  { id: 1, kind: "allow-always" },
                  { id: "always", kind: 2 },
                ],
                optionId: "once",
                text: "an answer",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({
      id: "approval-1",
      display: "select",
      allowFreeform: true,
      options: [
        {
          id: "once",
          kind: "allow-once",
          label: "Only once",
          grants: ["repository"],
          confirm: { title: "Confirm access" },
        },
      ],
      optionId: "once",
      text: "an answer",
    });
  });

  it("reads the request from the approval descriptor for a custom response channel", () => {
    const metadata: AISDKMessageConverterMetadata = {
      supportsRichToolApprovalResponses: true,
    };
    const descriptor = {
      prompt: "Which environment?",
      display: "select",
      allowFreeform: true,
      dismissible: true,
      options: [{ id: "staging", kind: "_target", label: "Staging" }],
      scope: "deploy",
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tc-1",
              state: "approval-requested",
              input: {},
              approval: {
                id: "approval-1",
                descriptor,
                requestReason: "Production access requires approval",
              },
            },
            {
              type: "tool-deploy",
              toolCallId: "tc-2",
              state: "approval-responded",
              input: {},
              approval: {
                id: "approval-2",
                approved: true,
                prompt: "Deploy?",
                descriptor: {
                  prompt: "Which environment?",
                  display: "text",
                  optionId: "staging",
                  text: "staging only",
                },
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const approvals = converted[0]?.content.map(
      (part) => (part as { approval?: unknown }).approval,
    );
    expect(approvals).toEqual([
      {
        id: "approval-1",
        prompt: "Which environment?",
        display: "select",
        allowFreeform: true,
        dismissible: true,
        options: [{ id: "staging", kind: "_target", label: "Staging" }],
        descriptor,
        requestReason: "Production access requires approval",
      },
      {
        id: "approval-2",
        approved: true,
        prompt: "Deploy?",
        display: "text",
        optionId: "staging",
        text: "staging only",
        descriptor: {
          prompt: "Which environment?",
          display: "text",
          optionId: "staging",
          text: "staging only",
        },
      },
    ]);
  });

  it("ignores a non-boolean dismissible field from the approval descriptor", () => {
    const metadata: AISDKMessageConverterMetadata = {
      supportsRichToolApprovalResponses: true,
    };
    const descriptor = {
      prompt: "Which environment?",
      display: "select",
      dismissible: "yes",
      options: [{ id: "staging", kind: "_target", label: "Staging" }],
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tc-1",
              state: "approval-requested",
              input: {},
              approval: { id: "approval-1", descriptor },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({
      id: "approval-1",
      prompt: "Which environment?",
      display: "select",
      options: [{ id: "staging", kind: "_target", label: "Staging" }],
      descriptor,
    });
    expect("dismissible" in toolCall.approval).toBe(false);
  });

  it("never lets a descriptor decide or identify its own request", () => {
    const metadata: AISDKMessageConverterMetadata = {
      supportsRichToolApprovalResponses: true,
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tc-1",
              state: "approval-requested",
              input: {},
              approval: {
                id: "approval-1",
                descriptor: {
                  id: "approval-9",
                  approved: true,
                  reason: "self approved",
                  isAutomatic: true,
                  requestReason: "descriptor reason",
                  display: "text",
                },
              },
            },
            {
              type: "tool-deploy",
              toolCallId: "tc-2",
              state: "approval-requested",
              input: {},
              approval: { id: "approval-2", descriptor: ["display", "text"] },
            },
            {
              type: "tool-deploy",
              toolCallId: "tc-3",
              state: "approval-requested",
              input: {},
              approval: { id: "approval-3", descriptor: "display:text" },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const approvals = converted[0]?.content.map(
      (part) => (part as { approval?: unknown }).approval,
    );
    expect(approvals).toEqual([
      {
        id: "approval-1",
        display: "text",
        descriptor: {
          id: "approval-9",
          approved: true,
          reason: "self approved",
          isAutomatic: true,
          requestReason: "descriptor reason",
          display: "text",
        },
      },
      { id: "approval-2", descriptor: ["display", "text"] },
      { id: "approval-3", descriptor: "display:text" },
    ]);
  });

  it("keeps a host answer off a request the descriptor has resolved", () => {
    const metadata: AISDKMessageConverterMetadata = {
      supportsRichToolApprovalResponses: true,
      toolApprovalResponses: new Map([
        ["approval-1", { approvalId: "approval-1", approved: true }],
      ]),
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tc-1",
              state: "approval-requested",
              input: {},
              approval: {
                id: "approval-1",
                descriptor: { resolution: "expired" },
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({
      id: "approval-1",
      resolution: "expired",
      descriptor: { resolution: "expired" },
    });
  });

  it("drops descriptor fields the AI SDK cannot answer without a custom response channel", () => {
    const descriptor = {
      prompt: "Which environment?",
      display: "select",
      allowFreeform: true,
      options: [{ id: "staging", kind: "_target" }],
      resolution: "expired",
    };
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-deploy",
            toolCallId: "tc-1",
            state: "approval-requested",
            input: {},
            approval: { id: "approval-1", descriptor },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({
      id: "approval-1",
      prompt: "Which environment?",
      resolution: "expired",
      descriptor,
    });
  });

  it("applies a host answer to an approval the message has not recorded", () => {
    const metadata: AISDKMessageConverterMetadata = {
      supportsRichToolApprovalResponses: true,
      toolApprovalResponses: new Map([
        [
          "approval-1",
          {
            approvalId: "approval-1",
            approved: true,
            optionId: "staging",
            text: "only staging",
          },
        ],
        ["approval-2", { approvalId: "approval-2", approved: true }],
        ["approval-3", { approvalId: "approval-3", approved: true }],
      ]),
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tc-1",
              state: "approval-requested",
              input: {},
              approval: {
                id: "approval-1",
                display: "select",
                options: [{ id: "staging", kind: "_target" }],
              },
            },
            {
              type: "tool-deploy",
              toolCallId: "tc-2",
              state: "approval-responded",
              input: {},
              approval: { id: "approval-2", approved: false, reason: "no" },
            },
            {
              type: "tool-deploy",
              toolCallId: "tc-3",
              state: "approval-requested",
              input: {},
              approval: { id: "approval-3", resolution: "expired" },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const approvals = converted[0]?.content.map(
      (part) => (part as { approval?: unknown }).approval,
    );
    expect(approvals).toEqual([
      {
        id: "approval-1",
        display: "select",
        options: [{ id: "staging", kind: "_target" }],
        approved: true,
        optionId: "staging",
        text: "only staging",
      },
      { id: "approval-2", approved: false, reason: "no" },
      { id: "approval-3", resolution: "expired" },
    ]);
  });

  it("drops a resolution the core contract does not declare", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-deploy",
            toolCallId: "tc-1",
            state: "approval-requested",
            input: {},
            approval: { id: "approval-1", resolution: "whatever" },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.approval).toEqual({ id: "approval-1" });
  });

  it("strips closing delimiters from streaming tool argsText", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "input-streaming",
            input: { city: "NYC" },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.argsText).toBe('{"city":"NYC');
  });

  it("attaches partial-JSON meta marking the trailing streaming field", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "input-streaming",
            input: { city: "NYC", units: "F" },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.args).toMatchObject({ city: "NYC", units: "F" });
    expect(getPartialJsonObjectFieldState(toolCall!.args, ["city"])).toBe(
      "complete",
    );
    expect(getPartialJsonObjectFieldState(toolCall!.args, ["units"])).toBe(
      "partial",
    );
  });

  it("keeps observed key order from streaming snapshots for final tool args", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const streaming = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-streaming",
              input: {
                type: "high_stock_model",
                limit: 5,
                filters: {
                  region: "us",
                  sector: "tech",
                },
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const streamingToolCall = streaming[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(streamingToolCall?.argsText).toBe(
      '{"type":"high_stock_model","limit":5,"filters":{"region":"us","sector":"tech',
    );

    const final = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-available",
              input: {
                filters: {
                  sector: "tech",
                  region: "us",
                },
                limit: 5,
                type: "high_stock_model",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const finalToolCall = final[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(finalToolCall?.argsText).toBe(
      '{"type":"high_stock_model","limit":5,"filters":{"region":"us","sector":"tech"}}',
    );
  });

  it("merges duplicate toolCallId across assistant snapshots", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-streaming",
              input: {
                type: "high_stock_model",
                limit: 5,
              },
            },
          ],
        } as any,
        {
          id: "a2",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-available",
              input: {
                limit: 5,
                type: "high_stock_model",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const toolCalls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls?.[0]?.toolCallId).toBe("tc-order-1");
    expect(JSON.parse(toolCalls?.[0]?.argsText ?? "{}")).toEqual({
      type: "high_stock_model",
      limit: 5,
    });
  });

  it("preserves last good input when AI SDK briefly emits null input", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
      toolLastInputCache: new Map<string, ReadonlyJSONObject>(),
    };

    const convertWithInput = (input: unknown) =>
      AISDKMessageConverter.toThreadMessages(
        [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-weather",
                toolCallId: "tc-1",
                state: "input-streaming",
                input,
              },
            ],
          } as any,
        ],
        false,
        metadata,
      )[0]?.content.find((part): part is any => part.type === "tool-call");

    const first = convertWithInput({ city: "NYC" });
    expect(first?.argsText).toBe('{"city":"NYC');
    expect(first?.args).toMatchObject({ city: "NYC" });

    const dropped = convertWithInput(null);
    expect(dropped?.argsText).toBe('{"city":"NYC');
    expect(dropped?.args).toMatchObject({ city: "NYC" });

    const undef = convertWithInput(undefined);
    expect(undef?.argsText).toBe('{"city":"NYC');
    expect(undef?.args).toMatchObject({ city: "NYC" });

    const grown = convertWithInput({ city: "NYC", units: "F" });
    expect(grown?.argsText).toBe('{"city":"NYC","units":"F');
    expect(grown?.args).toMatchObject({ city: "NYC", units: "F" });
  });

  it("preserves last good input across terminal state transitions", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
      toolLastInputCache: new Map<string, ReadonlyJSONObject>(),
    };

    AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "input-available",
              input: { city: "NYC" },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const terminal = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: null,
              output: { temp: 70 },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const call = terminal[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(Object.fromEntries(Object.entries(call?.args ?? {}))).toEqual({
      city: "NYC",
    });
    expect(call?.result).toEqual({ temp: 70 });
  });

  it("unwraps the modelContent envelope produced by frontend tool execution", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-readPdf",
            toolCallId: "tc-pdf",
            state: "output-available",
            input: {},
            output: {
              __aui_modelContent: [
                { type: "text", text: "PDF contents:" },
                {
                  type: "file",
                  data: "JVBERi0xLjQK",
                  mediaType: "application/pdf",
                },
              ],
              value: { mediaType: "application/pdf", base64: "JVBERi0xLjQK" },
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.result).toEqual({
      mediaType: "application/pdf",
      base64: "JVBERi0xLjQK",
    });
    expect(call?.modelContent).toEqual([
      { type: "text", text: "PDF contents:" },
      {
        type: "file",
        data: "JVBERi0xLjQK",
        mediaType: "application/pdf",
      },
    ]);
  });

  it("leaves a plain output untouched when no envelope is present", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "output-available",
            input: { city: "NYC" },
            output: { temp: 72 },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.result).toEqual({ temp: 72 });
    expect(call?.modelContent).toBeUndefined();
  });

  it.each([
    ["preliminary", true, true],
    ["final", undefined, undefined],
  ])(
    "marks a %s output-available part on the tool call",
    (_label, preliminary, isPreliminary) => {
      const converted = AISDKMessageConverter.toThreadMessages([
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 72 },
              ...(preliminary !== undefined && { preliminary }),
            },
          ],
        } as any,
      ]);

      const call = converted[0]?.content.find(
        (part): part is any => part.type === "tool-call",
      );
      expect(call?.result).toEqual({ temp: 72 });
      expect(call?.isPreliminary).toBe(isPreliminary);
    },
  );

  it("forwards callProviderMetadata.mcp.app onto ToolCallMessagePart.mcp.app", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-search",
            toolCallId: "tc-1",
            state: "output-available",
            input: { query: "hi" },
            output: { results: [] },
            callProviderMetadata: {
              mcp: {
                app: {
                  resourceUri: "ui://example/search",
                  mimeType: "text/html;profile=mcp-app",
                  visibility: ["app", "model", "bogus"],
                },
              },
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://example/search",
      mimeType: "text/html;profile=mcp-app",
      visibility: ["app", "model"],
    });
  });

  it("omits an empty callProviderMetadata.mcp.app.serverId", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-search",
            toolCallId: "tc-1",
            state: "output-available",
            input: { query: "hi" },
            output: { results: [] },
            callProviderMetadata: {
              mcp: {
                app: {
                  resourceUri: "ui://example/search",
                  serverId: "",
                },
              },
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://example/search",
    });
  });

  it("preserves providerMetadata on text and reasoning parts", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "hello",
            providerMetadata: { acme: { agentName: "researcher" } },
          },
          {
            type: "reasoning",
            text: "thinking",
            providerMetadata: { acme: { agentName: "researcher" } },
          },
          { type: "text", text: "plain" },
        ],
      } as any,
    ]);

    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "hello",
      providerMetadata: { acme: { agentName: "researcher" } },
    });
    expect(converted[0]?.content[1]).toMatchObject({
      type: "reasoning",
      text: "thinking",
      providerMetadata: { acme: { agentName: "researcher" } },
    });
    expect(converted[0]?.content[2]).not.toHaveProperty("providerMetadata");
  });

  it("maps TextUIPart.state onto the per-part status", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "streaming", state: "streaming" },
          { type: "text", text: "done", state: "done" },
          { type: "text", text: "unset" },
        ],
      } as any,
    ]);

    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "streaming",
      status: { type: "running" },
    });
    expect(converted[0]?.content[1]).toMatchObject({
      type: "text",
      text: "done",
      status: { type: "complete" },
    });
    expect(converted[0]?.content[2]).not.toHaveProperty("status");
  });

  it("maps ReasoningUIPart.state onto the per-part status", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "reasoning", text: "thinking", state: "streaming" },
          { type: "reasoning", text: "settled", state: "done" },
          { type: "reasoning", text: "unset" },
        ],
      } as any,
    ]);

    expect(converted[0]?.content[0]).toMatchObject({
      type: "reasoning",
      text: "thinking",
      status: { type: "running" },
    });
    expect(converted[0]?.content[1]).toMatchObject({
      type: "reasoning",
      text: "settled",
      status: { type: "complete" },
    });
    expect(converted[0]?.content[2]).not.toHaveProperty("status");
  });

  it("forwards callProviderMetadata onto ToolCallMessagePart.providerMetadata", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-search",
            toolCallId: "tc-1",
            state: "output-available",
            input: { query: "hi" },
            output: { results: [] },
            callProviderMetadata: { acme: { agentName: "researcher" } },
          },
          {
            type: "tool-search",
            toolCallId: "tc-2",
            state: "output-available",
            input: { query: "yo" },
            output: { results: [] },
          },
        ],
      } as any,
    ]);

    const calls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(calls?.[0]?.providerMetadata).toEqual({
      acme: { agentName: "researcher" },
    });
    expect(calls?.[1]).not.toHaveProperty("providerMetadata");
  });

  it("extracts MCP app metadata from output._meta['ui/resourceUri']", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-hello_ui",
            toolCallId: "tc-1",
            state: "output-available",
            input: {},
            output: {
              _meta: { "ui/resourceUri": "ui://app/hello_ui.html" },
              content: [{ type: "text", text: "" }],
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://app/hello_ui.html",
    });
  });

  it("adopts only spec'd ui fields from output._meta.ui", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-hello_ui",
            toolCallId: "tc-1",
            state: "output-available",
            input: {},
            output: {
              _meta: {
                ui: {
                  resourceUri: "ui://app/hello_ui.html",
                  serverId: "srv",
                  visibility: ["model"],
                },
              },
              content: [{ type: "text", text: "" }],
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://app/hello_ui.html",
      visibility: ["model"],
    });
  });

  it("prefers output._meta.ui.resourceUri over output._meta['ui/resourceUri']", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-hello_ui",
            toolCallId: "tc-1",
            state: "output-available",
            input: {},
            output: {
              _meta: {
                ui: { resourceUri: "ui://app/nested.html" },
                "ui/resourceUri": "ui://app/flat.html",
              },
              content: [{ type: "text", text: "" }],
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://app/nested.html",
    });
  });

  it("falls back to output._meta['ui/resourceUri'] when the nested resourceUri is not a ui:// app uri", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-hello_ui",
            toolCallId: "tc-1",
            state: "output-available",
            input: {},
            output: {
              _meta: {
                ui: { resourceUri: "https://example.com/not-an-app" },
                "ui/resourceUri": "ui://app/flat.html",
              },
              content: [{ type: "text", text: "" }],
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://app/flat.html",
    });
  });

  it("memoizes MCP app metadata across conversions by serverId and resourceUri", () => {
    const metadata: AISDKMessageConverterMetadata = {
      mcpAppMetadataCache: new Map(),
    };

    const buildMessage = (id: string, serverId: string) => ({
      id,
      role: "assistant" as const,
      parts: [
        {
          type: "tool-search",
          toolCallId: `${id}-call`,
          state: "output-available",
          input: { q: "hi" },
          output: {},
          callProviderMetadata: {
            mcp: {
              app: { resourceUri: "ui://example/search", serverId },
            },
          },
        } as any,
      ],
    });

    const first = AISDKMessageConverter.toThreadMessages(
      [buildMessage("a1", "search-server")],
      false,
      metadata,
    );
    const second = AISDKMessageConverter.toThreadMessages(
      [buildMessage("a2", "search-server")],
      false,
      metadata,
    );
    const third = AISDKMessageConverter.toThreadMessages(
      [buildMessage("a3", "other-server")],
      false,
      metadata,
    );

    const firstApp = first[0]?.content.find(
      (p): p is any => p.type === "tool-call",
    )?.mcp?.app;
    const secondApp = second[0]?.content.find(
      (p): p is any => p.type === "tool-call",
    )?.mcp?.app;
    const thirdApp = third[0]?.content.find(
      (p): p is any => p.type === "tool-call",
    )?.mcp?.app;
    expect(firstApp).toBeDefined();
    expect(firstApp).toBe(secondApp);
    expect(thirdApp).not.toBe(firstApp);
    expect(thirdApp).toEqual({
      resourceUri: "ui://example/search",
      serverId: "other-server",
    });
  });

  it("converts a reasoning-file part into a file part", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "reasoning-file",
            mediaType: "image/png",
            url: "data:image/png;base64,abc",
          },
        ],
      } as any,
    ]);

    expect(converted[0]?.content).toHaveLength(1);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "file",
      data: "data:image/png;base64,abc",
      mimeType: "image/png",
    });
  });

  it("converts a custom part into a data part named by its kind", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "custom",
            kind: "acme.widget",
            providerMetadata: { acme: { foo: "bar" } },
          },
        ],
      } as any,
    ]);

    expect(converted[0]?.content).toHaveLength(1);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "data",
      name: "acme.widget",
      data: { acme: { foo: "bar" } },
    });
  });

  it("preserves failed tool-call arguments from rawInput in the error snapshot", () => {
    // A tool that streamed complete arguments then failed schema validation
    // keeps those arguments in `rawInput`, not `input`. Converting from `input`
    // alone yields `{}`, hiding the real failed input from the UI.
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map(),
    };
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-error",
              rawInput: { city: "NYC", units: "F" },
              errorText: "arguments failed schema validation",
            },
          ],
        },
      ] as any,
      false,
      metadata,
    );

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(Object.fromEntries(Object.entries(toolCall?.args ?? {}))).toEqual({
      city: "NYC",
      units: "F",
    });
    expect(toolCall?.argsText).toBe('{"city":"NYC","units":"F"}');
  });

  it("releases the key-order entry once the tool call settles", () => {
    // Arrival order only matters while args stream; a settled input's own key
    // order is already deterministic, so the entry is released at settlement.
    const toolArgsKeyOrderCache: NonNullable<
      AISDKMessageConverterMetadata["toolArgsKeyOrderCache"]
    > = new Map();
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache,
      toolArgsTextCache: new WeakMap(),
    };
    const part = (state: string) => ({
      type: "tool-weather",
      toolCallId: "tc-1",
      state,
      input: { a: 1 },
      ...(state === "output-available" && { output: { ok: true } }),
    });
    const message = (state: string) =>
      [{ id: "a1", role: "assistant", parts: [part(state)] }] as any;

    AISDKMessageConverter.toThreadMessages(
      message("input-streaming"),
      true,
      metadata,
    );
    expect(toolArgsKeyOrderCache.size).toBe(1);

    AISDKMessageConverter.toThreadMessages(
      message("output-available"),
      false,
      metadata,
    );
    expect(toolArgsKeyOrderCache.size).toBe(0);
  });

  it("keeps frozen argsText per tool call when two calls settle on one shared input object", () => {
    // The frozen text depends on the call's streamed key order, so a shared
    // input object must not hand one call the other's text: that would turn
    // its streamed prefix into a non-prefix snapshot the tracker cannot close.
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map(),
      toolArgsTextCache: new WeakMap(),
    };
    const tool = (toolCallId: string, state: string, input: object) => ({
      type: "tool-weather",
      toolCallId,
      state,
      input,
      ...(state === "output-available" && { output: { ok: true } }),
    });
    const convert = (parts: object[]) =>
      AISDKMessageConverter.toThreadMessages(
        [{ id: "a1", role: "assistant", parts }] as any,
        false,
        metadata,
      )[0]!.content.filter((part): part is any => part.type === "tool-call");

    convert([
      tool("tc-a", "input-streaming", { a: 1, b: 2 }),
      tool("tc-b", "input-streaming", { b: 2, a: 1 }),
    ]);
    const shared = { a: 1, b: 2 };
    const settled = [
      tool("tc-a", "output-available", shared),
      tool("tc-b", "output-available", shared),
    ];
    const [a, b] = convert(settled);

    expect(a.argsText).toBe('{"a":1,"b":2}');
    expect(b.argsText).toBe('{"b":2,"a":1}');

    // Both entries must survive a reconversion: the key-order entries are gone
    // by now, so a cache miss would re-serialize B in raw key order.
    stableStringifySpy.mockClear();
    const [a2, b2] = convert(settled);
    expect(a2.argsText).toBe('{"a":1,"b":2}');
    expect(b2.argsText).toBe('{"b":2,"a":1}');
    expect(stableStringifySpy).not.toHaveBeenCalled();
  });

  it("serializes a settled tool call's argsText once when its input identity is stable", () => {
    // The frozen text is keyed weakly by the input object itself, so it becomes
    // collectible once that object is unreachable instead of outliving it.
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map(),
      toolArgsTextCache: new WeakMap(),
    };
    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "output-available",
            input: { a: 1, b: 2 },
            output: { ok: true },
          },
        ],
      },
    ] as any;

    stableStringifySpy.mockClear();
    for (let i = 0; i < 3; i++) {
      AISDKMessageConverter.toThreadMessages(messages, false, metadata);
    }
    expect(stableStringifySpy).toHaveBeenCalledTimes(1);
  });
});
