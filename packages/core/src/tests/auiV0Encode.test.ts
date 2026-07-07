import { describe, expect, it } from "vitest";
import { auiV0Decode, auiV0Encode } from "../react/runtimes/cloud/auiV0";

describe("auiV0Encode", () => {
  it("preserves document source parts in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
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
        },
      ],
    });

    expect(encoded.content).toEqual([
      {
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
      },
    ]);
  });

  it("preserves user attachments in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review this" }],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "proposal.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "data:application/pdf;base64,JVBERi0xLjQ=",
              mimeType: "application/pdf",
              filename: "proposal.pdf",
            },
          ],
        },
      ],
    });

    expect(encoded.attachments).toEqual([
      {
        id: "att-1",
        type: "document",
        name: "proposal.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: "data:application/pdf;base64,JVBERi0xLjQ=",
            mimeType: "application/pdf",
            filename: "proposal.pdf",
          },
        ],
      },
    ]);
  });
});

describe("auiV0Decode", () => {
  it("restores user attachments from core cloud history", () => {
    const content = auiV0Encode({
      id: "local",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review this" }],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "proposal.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "data:application/pdf;base64,JVBERi0xLjQ=",
              mimeType: "application/pdf",
              filename: "proposal.pdf",
            },
          ],
        },
      ],
    });

    const decoded = auiV0Decode({
      id: "cloud",
      parent_id: null,
      height: 0,
      created_at: new Date("2026-03-15T00:00:00.000Z"),
      updated_at: new Date("2026-03-15T00:00:00.000Z"),
      format: "aui/v0",
      content: content as never,
    });

    expect(decoded.message.role).toBe("user");
    if (decoded.message.role !== "user") throw new Error("expected user");
    expect(decoded.message.attachments).toEqual([
      {
        id: "att-1",
        type: "document",
        name: "proposal.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: "data:application/pdf;base64,JVBERi0xLjQ=",
            mimeType: "application/pdf",
            filename: "proposal.pdf",
          },
        ],
      },
    ]);
  });
});
