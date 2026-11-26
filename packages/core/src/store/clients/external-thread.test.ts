import { useState } from "react";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { ExternalThreadMessage } from "./external-thread";
import { ExternalThread } from "./external-thread";

const message: ExternalThreadMessage = {
  id: "message-1",
  role: "assistant",
  createdAt: new Date(0),
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "weather",
      args: {},
      argsText: "{}",
    },
  ],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

const createPart = (
  unstable_onRecordToolInteraction?: (
    options: Unstable_RecordToolInteractionOptions,
  ) => void,
  onResumeToolCall?: (options: {
    toolCallId: string;
    payload: unknown;
  }) => void,
) => {
  const root = createTapRoot(function ExternalThreadRoot() {
    return useResource(
      ExternalThread({
        messages: [message],
        ...(unstable_onRecordToolInteraction
          ? { unstable_onRecordToolInteraction }
          : {}),
        ...(onResumeToolCall ? { onResumeToolCall } : {}),
      }),
    );
  });
  return {
    part: root.getValue().message({ index: 0 }).part({ index: 0 }),
    unmount: () => root.unmount(),
  };
};

describe("ExternalThread send policy", () => {
  it("projects isSendDisabled onto thread state", () => {
    const root = createTapRoot(function ExternalThreadRoot() {
      return useResource(
        ExternalThread({ messages: [], isSendDisabled: true }),
      );
    });

    try {
      expect(root.getValue().getState().isSendDisabled).toBe(true);
    } finally {
      root.unmount();
    }
  });
});

describe("ExternalThread interaction recording", () => {
  it("keeps a part client with its id when parts swap", () => {
    const initial: ExternalThreadMessage = {
      ...message,
      content: [
        { type: "text", id: "p1", text: "first" },
        { type: "text", id: "p2", text: "second" },
      ],
    };
    let setMessage!: (message: ExternalThreadMessage) => void;
    const root = createTapRoot(function ExternalThreadRoot() {
      const [current, setValue] = useState<ExternalThreadMessage>(initial);
      setMessage = setValue;
      return useResource(ExternalThread({ messages: [current] }));
    });

    try {
      const first = root.getValue().message({ index: 0 }).part({ index: 0 });
      flushTapSync(() =>
        setMessage({
          ...initial,
          content: [
            { type: "text", id: "p2", text: "second streamed" },
            { type: "text", id: "p1", text: "first streamed" },
          ],
        }),
      );
      expect(root.getValue().message({ index: 0 }).part({ index: 1 })).toBe(
        first,
      );
      expect(first.getState()).toMatchObject({ text: "first streamed" });
    } finally {
      root.unmount();
    }
  });

  it("threads records from parts to the callback", async () => {
    const unstable_onRecordToolInteraction = vi.fn();
    const { part, unmount } = createPart(unstable_onRecordToolInteraction);

    try {
      await part.unstable_recordInteraction!({
        type: "action",
        payload: { action: "toggle" },
      });

      expect(unstable_onRecordToolInteraction).toHaveBeenCalledExactlyOnceWith({
        messageId: "message-1",
        toolCallId: "call-1",
        interaction: {
          type: "action",
          payload: { action: "toggle" },
          occurredAt: expect.any(Number),
        },
      });
    } finally {
      unmount();
    }
  });

  it("records an accepted human response after resuming", async () => {
    const onResumeToolCall = vi.fn();
    const unstable_onRecordToolInteraction = vi.fn();
    const { part, unmount } = createPart(
      unstable_onRecordToolInteraction,
      onResumeToolCall,
    );
    const payload = { answer: "yes" };

    try {
      part.resumeToolCall(payload);

      expect(onResumeToolCall).toHaveBeenCalledExactlyOnceWith({
        toolCallId: "call-1",
        payload,
      });
      await vi.waitFor(() =>
        expect(
          unstable_onRecordToolInteraction,
        ).toHaveBeenCalledExactlyOnceWith({
          messageId: "message-1",
          toolCallId: "call-1",
          interaction: {
            type: "human-response",
            payload,
            occurredAt: expect.any(Number),
          },
        }),
      );
      expect(onResumeToolCall.mock.invocationCallOrder[0]).toBeLessThan(
        unstable_onRecordToolInteraction.mock.invocationCallOrder[0]!,
      );
    } finally {
      unmount();
    }
  });

  it("keeps an accepted resume successful when recording fails", async () => {
    const onResumeToolCall = vi.fn();
    const record = vi.fn(() => Promise.reject(new Error("recording failed")));
    const { part, unmount } = createPart(record, onResumeToolCall);

    try {
      expect(() => part.resumeToolCall({ answer: "yes" })).not.toThrow();
      await vi.waitFor(() => expect(record).toHaveBeenCalledOnce());
      expect(onResumeToolCall).toHaveBeenCalledOnce();
    } finally {
      unmount();
    }
  });

  it("rejects when no interaction callback is configured", async () => {
    const { part, unmount } = createPart();

    try {
      await expect(
        part.unstable_recordInteraction!({ type: "action", payload: {} }),
      ).rejects.toThrow(
        "Runtime does not support recording tool interactions.",
      );
    } finally {
      unmount();
    }
  });
});

describe("ExternalThread earlier messages", () => {
  it("shares one in-flight load and reports it in thread state", async () => {
    let finish!: () => void;
    const onLoadEarlier = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const root = createTapRoot(function ExternalThreadRoot() {
      return useResource(
        ExternalThread({
          messages: [message],
          hasEarlier: true,
          onLoadEarlier,
        }),
      );
    });

    try {
      expect(root.getValue().getState()).toMatchObject({
        hasEarlier: true,
        isLoadingEarlier: false,
      });
      let first!: Promise<void>;
      let second!: Promise<void>;
      flushTapSync(() => {
        first = root.getValue().loadEarlier();
        second = root.getValue().loadEarlier();
      });
      expect(second).toBe(first);
      expect(root.getValue().getState().isLoadingEarlier).toBe(true);

      await Promise.resolve();
      finish();
      await first;
      expect(onLoadEarlier).toHaveBeenCalledTimes(1);
      await vi.waitFor(() =>
        expect(root.getValue().getState().isLoadingEarlier).toBe(false),
      );
    } finally {
      root.unmount();
    }
  });

  it("reports no earlier messages without a loader", () => {
    const root = createTapRoot(function ExternalThreadRoot() {
      return useResource(
        ExternalThread({ messages: [message], hasEarlier: true }),
      );
    });

    try {
      expect(root.getValue().getState().hasEarlier).toBe(false);
    } finally {
      root.unmount();
    }
  });
});

describe("ExternalThread prepending history", () => {
  const userMessage = (id: string, text: string) =>
    ({
      id,
      role: "user",
      content: [{ type: "text", text }],
      attachments: [],
      createdAt: new Date(0),
      metadata: { custom: {} },
    }) as ExternalThreadMessage;

  const assistantMessage = (id: string, text: string) =>
    ({
      id,
      role: "assistant",
      content: [{ type: "text", text }],
      createdAt: new Date(0),
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    }) as ExternalThreadMessage;

  it("keeps a dispatched send in transit when earlier history is prepended", async () => {
    const upload = Promise.withResolvers<void>();
    const onNew = vi.fn();
    const attachmentAdapter: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }: { file: File }) => ({
        id: file.name,
        type: "file",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send: async (attachment) => {
        await upload.promise;
        return {
          ...attachment,
          status: { type: "complete" as const },
          content: [],
        };
      },
    };

    const initial = [
      userMessage("u2", "hi"),
      assistantMessage("a2", "resp"),
    ] as const;

    const root = createTapRoot(function ExternalThreadRoot() {
      const [messages, setMessages] =
        useState<readonly ExternalThreadMessage[]>(initial);
      const onLoadEarlier = async () => {
        setMessages((prev) => [
          userMessage("u1", "older"),
          assistantMessage("a1", "old-resp"),
          ...prev,
        ]);
      };
      return useResource(
        ExternalThread({
          messages,
          hasEarlier: true,
          onLoadEarlier,
          attachmentAdapter,
          onNew,
        }),
      );
    });

    try {
      const composer = () => root.getValue().composer();
      const rows = () =>
        root
          .getValue()
          .getState()
          .messages.map((m) => m.submission?.text ?? m.id);

      await composer().addAttachment(
        new File(["content"], "a.txt", { type: "text/plain" }),
      );
      composer().setText("hello");
      composer().send();
      await vi.waitFor(() => expect(rows()).toEqual(["u2", "a2", "hello"]));

      upload.resolve();
      await vi.waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
      await vi.waitFor(() => expect(rows()).toEqual(["u2", "a2", "hello"]));

      const earlier = root.getValue().loadEarlier();
      await earlier;
      flushTapSync(() => {});
      await vi.waitFor(() => expect(rows()).toContain("u1"));

      expect(rows()).toEqual(["u1", "a1", "u2", "a2", "hello"]);
    } finally {
      root.unmount();
    }
  }, 20_000);
});
