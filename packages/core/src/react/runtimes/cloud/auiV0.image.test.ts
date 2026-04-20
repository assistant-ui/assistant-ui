import { describe, expect, it } from "vitest";
import { auiV0Encode, auiV0Decode } from "./auiV0";
import type { ThreadMessage } from "../../../types/message";

const baseMeta = {
  unstable_annotations: [],
  unstable_data: [],
  steps: [],
  custom: {},
} as const;

describe("auiV0Encode/Decode — ImageMessagePart round-trip", () => {
  it("preserves all optional generation metadata fields", () => {
    const message = {
      id: "m1",
      role: "assistant",
      createdAt: new Date("2026-04-17T00:00:00Z"),
      status: { type: "complete", reason: "stop" },
      content: [
        {
          type: "image",
          image: "data:image/png;base64,iVBORw0KGgo=",
          filename: "hat.png",
          prompt: "a cat in a hat",
          revisedPrompt: "a photorealistic cat in a red hat",
          model: "gpt-image-1",
          seed: 42,
          width: 1024,
          height: 1024,
          mimeType: "image/png",
          generationId: "gen-xyz",
        },
      ],
      metadata: baseMeta,
      attachments: [],
    } as unknown as ThreadMessage;

    const encoded = auiV0Encode(message);
    const part = encoded.content[0];

    expect(part).toEqual({
      type: "image",
      image: "data:image/png;base64,iVBORw0KGgo=",
      filename: "hat.png",
      prompt: "a cat in a hat",
      revisedPrompt: "a photorealistic cat in a red hat",
      model: "gpt-image-1",
      seed: 42,
      width: 1024,
      height: 1024,
      mimeType: "image/png",
      generationId: "gen-xyz",
    });

    const decoded = auiV0Decode({
      id: "m1",
      parent_id: null,
      created_at: new Date("2026-04-17T00:00:00Z"),
      format: "aui/v0",
      content: encoded as unknown,
    } as any);

    expect(decoded.message.content[0]).toMatchObject({
      type: "image",
      image: "data:image/png;base64,iVBORw0KGgo=",
      filename: "hat.png",
      prompt: "a cat in a hat",
      revisedPrompt: "a photorealistic cat in a red hat",
      model: "gpt-image-1",
      seed: 42,
      width: 1024,
      height: 1024,
      mimeType: "image/png",
      generationId: "gen-xyz",
    });
  });

  it("preserves minimal ImageMessagePart (only type + image)", () => {
    const message = {
      id: "m2",
      role: "assistant",
      createdAt: new Date(0),
      status: { type: "complete", reason: "stop" },
      content: [{ type: "image", image: "https://cdn/x.png" }],
      metadata: baseMeta,
      attachments: [],
    } as unknown as ThreadMessage;

    const encoded = auiV0Encode(message);
    expect(encoded.content[0]).toEqual({
      type: "image",
      image: "https://cdn/x.png",
    });
  });
});
