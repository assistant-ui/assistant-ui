import type { ThreadMessage, ToolCallMessagePart } from "@assistant-ui/core";
import { describe, expect, it } from "vitest";
import { toLanguageModelMessages } from "./toLanguageModelMessages";

const createFileMessage = (
  data: string,
): Extract<ThreadMessage, { role: "user" }> => ({
  id: "user-1",
  role: "user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  content: [{ type: "file", data, mimeType: "text/plain" }],
  attachments: [],
  metadata: { custom: {} },
});

const createAudioMessage = (
  format: "mp3" | "wav",
  attached = false,
  data = "UklGRg==",
): Extract<ThreadMessage, { role: "user" }> => ({
  id: "user-audio",
  role: "user",
  createdAt: new Date(0),
  content: attached ? [] : [{ type: "audio", audio: { data, format } }],
  attachments: attached
    ? [
        {
          id: "attachment-audio",
          type: "audio",
          name: `recording.${format}`,
          contentType: `audio/${format}`,
          status: { type: "complete" },
          content: [{ type: "audio", audio: { data, format } }],
        },
      ]
    : [],
  metadata: { custom: {} },
});

const createToolMessage = (
  part: Partial<ToolCallMessagePart>,
): ThreadMessage => ({
  id: "assistant-1",
  role: "assistant",
  createdAt: new Date(0),
  status: { type: "requires-action", reason: "tool-calls" },
  metadata: {
    custom: {},
    steps: [],
    unstable_data: [],
    unstable_annotations: [],
    unstable_state: {},
  },
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "lookup",
      args: {},
      argsText: "{}",
      ...part,
    },
  ],
});

const convertFileData = (data: string) => {
  const [message] = toLanguageModelMessages([createFileMessage(data)]);
  if (message?.role !== "user") throw new Error("Expected a user message");

  const [part] = message.content;
  if (part?.type !== "file") throw new Error("Expected a file part");

  return part.data;
};

describe("toLanguageModelMessages", () => {
  it.each(["mp3", "wav"] as const)(
    "converts inline legacy %s audio into a model file part",
    (format) => {
      expect(toLanguageModelMessages([createAudioMessage(format)])).toEqual([
        {
          role: "user",
          content: [
            { type: "file", data: "UklGRg==", mediaType: `audio/${format}` },
          ],
        },
      ]);
    },
  );

  it("uses the audio format when an input data URL declares a different type", () => {
    const [message] = toLanguageModelMessages([
      createAudioMessage("wav", false, "data:audio/mpeg;base64,UklGRg=="),
    ]);

    expect(message).toEqual({
      role: "user",
      content: [
        {
          type: "file",
          data: new URL("data:audio/wav;base64,UklGRg=="),
          mediaType: "audio/wav",
        },
      ],
    });
  });

  it.each(["mp3", "wav"] as const)(
    "converts completed %s audio attachments into model file parts",
    (format) => {
      expect(
        toLanguageModelMessages([createAudioMessage(format, true)]),
      ).toEqual([
        {
          role: "user",
          content: [
            { type: "file", data: "UklGRg==", mediaType: `audio/${format}` },
          ],
        },
      ]);
    },
  );

  it("preserves an equivalent audio MIME file part", () => {
    const [message] = toLanguageModelMessages([
      {
        ...createFileMessage("UklGRg=="),
        content: [{ type: "file", data: "UklGRg==", mimeType: "audio/wav" }],
      },
    ]);

    expect(message).toEqual({
      role: "user",
      content: [{ type: "file", data: "UklGRg==", mediaType: "audio/wav" }],
    });
  });

  it("skips an assistant message without content instead of throwing", () => {
    expect(
      toLanguageModelMessages([{ id: "a", role: "assistant" }] as never),
    ).toEqual([]);
  });

  it("skips an attachment without content instead of throwing", () => {
    expect(
      toLanguageModelMessages([
        { id: "u", role: "user", content: [], attachments: [{ id: "a" }] },
      ] as never),
    ).toEqual([]);
  });

  it("preserves IDs when an earlier message produces no model message", () => {
    const messages: ThreadMessage[] = [
      {
        id: "empty-user",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        content: [],
        attachments: [],
        metadata: { custom: {} },
      },
      {
        id: "visible-user",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
        content: [{ type: "text", text: "hello" }],
        attachments: [],
        metadata: { custom: {} },
      },
    ];

    expect(
      toLanguageModelMessages(messages, { unstable_includeId: true }),
    ).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "hello" }],
        unstable_id: "visible-user",
      },
    ]);
  });

  it("preserves the source ID on split assistant messages", () => {
    const messages: ThreadMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        content: [
          { type: "text", text: "before" },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "lookup",
            args: { query: "assistant-ui" },
            argsText: '{"query":"assistant-ui"}',
            result: { found: true },
          },
          { type: "text", text: "after" },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: {},
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      },
    ];

    const converted = toLanguageModelMessages(messages, {
      unstable_includeId: true,
    });

    expect(converted.map((message) => message.role)).toEqual([
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(converted[0]).toHaveProperty("unstable_id", "assistant-1");
    expect(converted[1]).not.toHaveProperty("unstable_id");
    expect(converted[2]).toHaveProperty("unstable_id", "assistant-1");
  });

  describe.each<[string, Partial<ToolCallMessagePart>]>([
    ["a pending approval", { approval: { id: "approval-1" } }],
    [
      "an approved call awaiting execution",
      { approval: { id: "approval-1", approved: true } },
    ],
    ["an interrupted call", { interrupt: { type: "human", payload: {} } }],
  ])("message IDs with %s", (_label, part) => {
    it.each([false, true])(
      "closes a followed call without changing its source (empty next message: %s)",
      (empty) => {
        const assistant = createToolMessage(part);
        const user = {
          ...createFileMessage("SGVsbG8="),
          ...(empty ? { content: [] } : {}),
        };
        const messages = [assistant, user];
        const original = structuredClone(messages);
        const plain = toLanguageModelMessages(messages);
        expect(plain.map((message) => message.role)).toEqual(
          empty ? ["assistant", "tool"] : ["assistant", "tool", "user"],
        );
        const withIds = toLanguageModelMessages(messages, {
          unstable_includeId: true,
        });
        expect(withIds.map(({ role, content }) => ({ role, content }))).toEqual(
          plain,
        );
        expect(withIds[0]).toHaveProperty("unstable_id", "assistant-1");
        expect(withIds[1]).not.toHaveProperty("unstable_id");
        if (!empty) expect(withIds[2]).toHaveProperty("unstable_id", "user-1");
        expect(messages).toEqual(original);
      },
    );

    it("keeps the last call awaiting the host", () => {
      const messages = [createToolMessage(part)];
      const plain = toLanguageModelMessages(messages);
      expect(plain.map((message) => message.role)).toEqual(["assistant"]);
      const withIds = toLanguageModelMessages(messages, {
        unstable_includeId: true,
      });
      expect(withIds.map(({ role, content }) => ({ role, content }))).toEqual(
        plain,
      );
      expect(withIds[0]).toHaveProperty("unstable_id", "assistant-1");
    });
  });

  it.each<Partial<ToolCallMessagePart>>([
    { approval: { id: "approval-1", approved: false } },
    { approval: { id: "approval-1", resolution: "cancelled" } },
    { result: { partial: true }, isPreliminary: true },
    { result: { error: "lookup failed" }, isError: true },
  ])("preserves terminal and preliminary results with IDs: %j", (part) => {
    const messages = [createToolMessage(part)];
    const plain = toLanguageModelMessages(messages);
    expect(plain.map((message) => message.role)).toEqual(["assistant", "tool"]);
    const withIds = toLanguageModelMessages(messages, {
      unstable_includeId: true,
    });
    expect(withIds.map(({ role, content }) => ({ role, content }))).toEqual(
      plain,
    );
  });

  it("carries a file part filename through to the model message", () => {
    const [message] = toLanguageModelMessages([
      {
        id: "user-1",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        content: [
          {
            type: "file",
            data: "SGVsbG8=",
            mimeType: "text/plain",
            filename: "notes.txt",
          },
        ],
        attachments: [],
        metadata: { custom: {} },
      },
    ]);
    if (message?.role !== "user") throw new Error("Expected a user message");

    expect(message.content[0]).toMatchObject({
      type: "file",
      filename: "notes.txt",
    });
  });

  it("preserves generated files in assistant history", () => {
    expect(
      toLanguageModelMessages([
        {
          id: "assistant-1",
          role: "assistant",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          content: [
            {
              type: "file",
              data: "iVBORw0KGgo=",
              mimeType: "image/png",
              filename: "generated.png",
            },
          ],
          status: { type: "complete", reason: "stop" },
          metadata: {
            unstable_state: {},
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
      ]),
    ).toEqual([
      {
        role: "assistant",
        content: [
          {
            type: "file",
            data: "iVBORw0KGgo=",
            mediaType: "image/png",
            filename: "generated.png",
          },
        ],
      },
    ]);
  });

  it("omits filename when the part has none", () => {
    const [message] = toLanguageModelMessages([createFileMessage("SGVsbG8=")]);
    if (message?.role !== "user") throw new Error("Expected a user message");

    expect(message.content[0]).not.toHaveProperty("filename");
  });

  it("preserves base64 file data as a string", () => {
    expect(convertFileData("SGVsbG8=")).toBe("SGVsbG8=");
  });

  it("preserves absolute file URLs", () => {
    const data = convertFileData("https://example.com/file.txt");

    expect(data).toBeInstanceOf(URL);
    expect(String(data)).toBe("https://example.com/file.txt");
  });

  it("preserves data URLs", () => {
    const url = "data:text/plain;base64,SGVsbG8=";
    const data = convertFileData(url);

    expect(data).toBeInstanceOf(URL);
    expect(String(data)).toBe(url);
  });
});
