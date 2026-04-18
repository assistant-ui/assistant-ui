import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import {
  MessagePersistence,
  MESSAGE_FORMAT,
} from "../../chat/MessagePersistence";
import { aiSDKV6FormatAdapter } from "../../../../react-ai-sdk/src/ui/adapters/aiSDKFormatAdapter";

// If this fails, update both adapters together or document intentional divergence.
type CloudMessageStorageEntry = Parameters<
  typeof aiSDKV6FormatAdapter.decode
>[0];

type CloudMessageRow = {
  id: string;
  parent_id: string | null;
  format: string;
  content: Record<string, unknown>;
};

function createCloudMock() {
  const create = vi
    .fn()
    .mockResolvedValue({ message_id: "remote-message-id-1" });
  const list = vi.fn().mockResolvedValue({ messages: [] as CloudMessageRow[] });

  return {
    cloud: {
      threads: {
        messages: {
          create,
          list,
        },
      },
    },
    create,
    list,
  };
}

function createComplexMessage(): UIMessage {
  return {
    id: "ui-message-1",
    role: "assistant",
    metadata: {
      requestId: "req_123",
      nested: {
        steps: 2,
        flags: ["stream", "attachments"],
      },
    },
    parts: [
      {
        type: "text",
        text: "hello with nested metadata",
      },
      {
        type: "tool-invocation",
        toolCallId: "tool-1",
        toolName: "calculator",
        state: "input-available",
        input: { a: 1, b: 2, extra: { nested: true } },
      } as never,
      {
        type: "text",
        text: "final segment",
      },
    ],
  } as UIMessage;
}

describe("CONTRACT: cloud-ai-sdk and react-ai-sdk ai-sdk/v6 adapters must stay in lockstep", () => {
  let message: UIMessage;
  let create: ReturnType<typeof createCloudMock>["create"];
  let list: ReturnType<typeof createCloudMock>["list"];

  beforeEach(() => {
    vi.clearAllMocks();
    message = createComplexMessage();
    const mock = createCloudMock();
    create = mock.create;
    list = mock.list;
  });

  it("uses the same format contract value", () => {
    expect(MESSAGE_FORMAT).toBe(aiSDKV6FormatAdapter.format);
  });

  it("persists messages with encoded payload equivalent to ai-sdk/v6 adapter", async () => {
    const { cloud } = createCloudMock();
    const persistence = new MessagePersistence(cloud as never, vi.fn());
    const mountedRef = { current: true };
    create = cloud.threads.messages.create as never;

    await persistence.persist("thread-1", [message], mountedRef);

    const [, payload] = create.mock.calls[0] as [
      string,
      {
        parent_id: string | null;
        format: string;
        content: Record<string, unknown>;
      },
    ];

    expect(payload.format).toBe(MESSAGE_FORMAT);
    expect(payload.parent_id).toBeNull();
    expect(payload.content).toEqual(
      aiSDKV6FormatAdapter.encode({
        message,
        parentId: null,
      }),
    );
  });

  it("uses react-adapter id semantics for persistence dedupe", async () => {
    const duplicateIdMessage = {
      ...message,
      parts: [...message.parts],
    } as UIMessage;
    const { cloud } = createCloudMock();
    const persistence = new MessagePersistence(cloud as never, vi.fn());
    create = cloud.threads.messages.create as never;

    expect(aiSDKV6FormatAdapter.getId(message)).toBe(
      aiSDKV6FormatAdapter.getId(duplicateIdMessage),
    );
    await persistence.persist("thread-1", [message, duplicateIdMessage], {
      current: true,
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("decodes loaded cloud rows with the same parent/message mapping shape as ai-sdk/v6 adapter", async () => {
    const storedRow: CloudMessageStorageEntry = {
      id: "remote-parent-1",
      parent_id: "remote-grandparent-1",
      format: MESSAGE_FORMAT,
      content: aiSDKV6FormatAdapter.encode({
        message,
        parentId: null,
      }),
    };

    const unrelatedRow: CloudMessageRow = {
      id: "other-format",
      parent_id: null,
      format: "other-format",
      content: { kind: "ignored", value: "ignore-me" },
    };

    const { cloud } = createCloudMock();
    list = cloud.threads.messages.list as never;
    list.mockResolvedValue({
      messages: [storedRow, unrelatedRow] as CloudMessageRow[],
    });

    const persistence = new MessagePersistence(cloud as never, vi.fn());
    const messages = await persistence.loadMessages("thread-1");

    expect(messages).toEqual([aiSDKV6FormatAdapter.decode(storedRow).message]);
  });

  it("dedupes repeated persists by message id in cloud-ai-sdk persistence flow", async () => {
    const { cloud } = createCloudMock();
    const persistence = new MessagePersistence(cloud as never, vi.fn());
    create = cloud.threads.messages.create as never;

    await Promise.all([
      persistence.persist("thread-1", [message], { current: true }),
      persistence.persist("thread-1", [message], { current: true }),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
  });
});
