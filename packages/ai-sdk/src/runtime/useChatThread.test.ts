// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { resource, useResource, flushTapSync } from "@assistant-ui/tap";
import { useState } from "react";
import type { ChatTransport, UIMessage } from "ai";
import {
  RuntimeAdapter,
  runtimeAdapterTransformScopes,
} from "@assistant-ui/core/store";
import {
  attachTransformScopes,
  AuiConfig,
  createAssistantClient,
} from "@assistant-ui/store/client";
import {
  createChat,
  useChatThread,
  type ChatThreadEnvironment,
} from "./useChatThread";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import {
  createResumableSessionStorage,
  RESUMABLE_STREAM_ID_HEADER,
} from "../transport/resumable";
import type { UIMessageChunk } from "ai";
import {
  createCancellableTransport,
  nextTask,
} from "./__tests__/controlled-transport";

const createHost = (
  env: Pick<ChatThreadEnvironment, "stopOnClientDestroy" | "chat">,
) => {
  const useHost = (options: Parameters<typeof useChatThread>[0]) => {
    const [threadListItem] = useState(() => ({
      initialize: async () => ({ remoteId: "main", externalId: undefined }),
    }));
    const runtime = useChatThread(options, {
      id: "main",
      isMainThread: true,
      getThreadListItem: () => threadListItem,
      ...env,
    });
    return useResource(RuntimeAdapter(runtime));
  };
  attachTransformScopes(useHost, runtimeAdapterTransformScopes);
  return resource(useHost);
};

const streamThenDestroy = async (
  env: Pick<ChatThreadEnvironment, "stopOnClientDestroy">,
) => {
  const { transport, getCancelCount, close } = createCancellableTransport();
  const Host = createHost(env);
  const handle = createAssistantClient(
    AuiConfig({ threads: Host({ transport }) }),
  );
  handle.subscribe(() => {});
  const aui = handle.getClient();

  try {
    flushTapSync(() => aui.composer.setText("stop me"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => {
      expect(aui.thread.getState().isRunning).toBe(true);
    });
  } finally {
    handle.destroy();
  }
  await nextTask();
  const cancelCount = getCancelCount();
  if (cancelCount === 0) close();
  return cancelCount;
};

describe("useChatThread", () => {
  it.each(["send", "resume"])(
    "ignores errors from a subsequent %s when a resume finishes",
    async (nextRequest) => {
      const storage = createResumableSessionStorage({
        key: `resume-${nextRequest}-race`,
      });
      storage.setStreamId("stream-1", "main");
      const error = new Error(`${nextRequest} offline`);
      const onError = vi.fn();
      const onResumeError = vi.fn();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const transport = {
        getResumableAdapter: () => ({ storage }),
        reconnectToStream: vi
          .fn<ChatTransport<UIMessage>["reconnectToStream"]>()
          .mockRejectedValue(error)
          .mockImplementationOnce(
            async () =>
              new ReadableStream({
                start(controller) {
                  controller.enqueue({ type: "start", messageId: "resumed" });
                  controller.close();
                },
              }),
          ),
        sendMessages: vi.fn(async () => {
          throw error;
        }),
      } satisfies ChatTransport<UIMessage> & {
        getResumableAdapter: () => { storage: typeof storage };
      };
      let sent = false;
      const callbacks = {
        onError,
        onFinish: () => {
          if (!sent) {
            sent = true;
            if (nextRequest === "resume") {
              void chat.resumeStream();
            } else {
              void chat.sendMessage({
                role: "user",
                parts: [{ type: "text", text: "next" }],
              });
            }
          }
        },
      };
      const chat = createChat(
        {
          id: "main",
          transport,
        },
        { current: callbacks },
      );
      const Host = createHost({ chat });
      const handle = createAssistantClient(
        AuiConfig({ threads: Host({ transport, onResumeError }) }),
      );
      handle.subscribe(() => {});
      try {
        await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error));
        await nextTask();
        expect(onResumeError).not.toHaveBeenCalled();
        expect(storage.getStreamId("main")).toBe("stream-1");
      } finally {
        handle.destroy();
        storage.clear();
        warn.mockRestore();
      }
    },
  );

  it.each([false, true])(
    "reports SDK reconnect failures and preserves replacement checkpoints: %s",
    async (replaceCheckpoint) => {
      const storage = createResumableSessionStorage({
        key: `automatic-resume-error-${replaceCheckpoint}`,
      });
      storage.setStreamId("failed-stream", "main");
      const error = new Error("resume offline");
      const onError = vi.fn();
      const onResumeError = vi.fn(() => {
        if (replaceCheckpoint) storage.setStreamId("replacement", "main");
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let finishReplacement: (() => void) | undefined;
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValueOnce(error)
        .mockImplementation(
          () =>
            new Promise<Response>((resolve) => {
              finishReplacement = () =>
                resolve(new Response(null, { status: 204 }));
            }),
        );
      const Host = createHost({});
      const handle = createAssistantClient(
        AuiConfig({
          threads: Host({
            transport: new AssistantChatTransport({
              fetch,
              resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
            }),
            onError,
            onResumeError,
          }),
        }),
      );
      handle.subscribe(() => {});
      try {
        await vi.waitFor(() => {
          expect(onError).toHaveBeenCalledWith(error);
          expect(onResumeError).toHaveBeenCalledOnce();
        });
        expect(onResumeError).toHaveBeenCalledWith(error);
        expect(warn).toHaveBeenCalledWith(
          "[assistant-ui] resumable: resume failed",
          error,
        );
        expect(storage.getStreamId("main")).toBe(
          replaceCheckpoint ? "replacement" : null,
        );
      } finally {
        handle.destroy();
        finishReplacement?.();
        storage.clear();
        warn.mockRestore();
      }
    },
  );

  it.each([false, true])(
    "scopes branch checkpoint cleanup to the manual resume opt-in: %s",
    async (canResume) => {
      const storage = createResumableSessionStorage({ key: "resume-branch" });
      storage.clear();
      let stream!: ReadableStreamDefaultController<Uint8Array>;
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(
          new ReadableStream({
            start: (controller) => {
              stream = controller;
            },
          }),
          {
            headers: {
              "content-type": "text/event-stream",
              [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
            },
          },
        ),
      );
      const onBranchChange = vi.fn(() =>
        expect(storage.getStreamId("main")).toBe(canResume ? null : "stream-1"),
      );
      const Host = createHost({});
      const handle = createAssistantClient(
        AuiConfig({
          threads: Host({
            canResume,
            transport: new AssistantChatTransport({
              fetch,
              resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
            }),
            messageRepository: {
              headId: "other",
              messages: [
                {
                  parentId: null,
                  message: {
                    id: "question",
                    role: "user",
                    parts: [{ type: "text", text: "Question" }],
                  },
                },
                {
                  parentId: "question",
                  message: {
                    id: "other",
                    role: "assistant",
                    parts: [{ type: "text", text: "Other branch" }],
                  },
                },
              ],
            },
            unstable_onBranchChange: onBranchChange,
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();
      try {
        await vi.waitFor(() =>
          expect(aui.thread.getState().messages.at(-1)?.id).toBe("other"),
        );
        flushTapSync(() => aui.thread.message({ id: "other" }).reload());
        for (const chunk of [
          { type: "start", messageId: "answer" },
          { type: "text-start", id: "text" },
          { type: "text-delta", id: "text", delta: "Partial" },
        ] satisfies UIMessageChunk[])
          stream.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        await vi.waitFor(() =>
          expect(aui.thread.getState().messages.at(-1)?.id).toBe("answer"),
        );
        flushTapSync(() => aui.thread.cancelRun());
        await vi.waitFor(() => {
          expect(aui.thread.getState().isRunning).toBe(false);
          expect(aui.thread.getState().canResume).toBe(canResume);
        });
        flushTapSync(() =>
          aui.thread
            .message({ id: "answer" })
            .switchToBranch({ branchId: "answer" }),
        );
        expect(storage.getStreamId("main")).toBe("stream-1");
        expect(onBranchChange).not.toHaveBeenCalled();
        flushTapSync(() =>
          aui.thread
            .message({ id: "answer" })
            .switchToBranch({ branchId: "other" }),
        );
        await vi.waitFor(() => {
          expect(aui.thread.getState().canResume).toBe(false);
          expect(aui.thread.getState().messages.at(-1)?.id).toBe("other");
        });
        expect(onBranchChange).toHaveBeenCalledWith({
          headId: "other",
          visibleMessageIds: ["question", "other"],
        });
        if (canResume) {
          await aui.thread.resumeRun({ parentId: "other" });
        } else {
          await expect(
            aui.thread.resumeRun({ parentId: "other" }),
          ).rejects.toThrow("Runtime does not support resuming runs.");
        }
        expect(fetch).toHaveBeenCalledOnce();
        expect(aui.thread.getState().messages.at(-1)?.parts[0]).toMatchObject({
          type: "text",
          text: "Other branch",
        });
      } finally {
        handle.destroy();
        storage.clear();
      }
    },
  );

  it.each(
    ([204, 404, "network", "aborted"] as const).flatMap((result) =>
      (["cancelled", "failed"] as const).map(
        (interruption) => [result, interruption] as const,
      ),
    ),
  )(
    "handles reconnect result %s after a %s stream",
    async (result, interruption) => {
      const storage = createResumableSessionStorage({
        key: `resume-${result}-${interruption}`,
      });
      storage.clear();
      const onResumeError = vi.fn();
      const onError = vi.fn();
      const streamError = new Error("initial stream disconnected");
      let initial!: ReadableStreamDefaultController<Uint8Array>;
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start: (controller) => {
              initial = controller;
            },
          }),
          {
            headers: {
              "content-type": "text/event-stream",
              [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
            },
          },
        ),
      );
      if (result === "network")
        fetch.mockRejectedValueOnce(new Error("offline"));
      else if (result === "aborted") {
        fetch.mockImplementationOnce(
          (_input, init) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener(
                "abort",
                () => reject(new DOMException("Stopped", "AbortError")),
                { once: true },
              );
            }),
        );
      } else
        fetch.mockResolvedValueOnce(new Response(null, { status: result }));
      const Host = createHost({});
      const handle = createAssistantClient(
        AuiConfig({
          threads: Host({
            canResume: true,
            transport: new AssistantChatTransport({
              fetch,
              resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
            }),
            onResumeError,
            onError,
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();
      try {
        flushTapSync(() => aui.composer.setText("continue"));
        flushTapSync(() => aui.composer.send());
        initial.enqueue(
          new TextEncoder().encode(
            'data: {"type":"start","messageId":"answer"}\n\n',
          ),
        );
        await vi.waitFor(() => {
          expect(aui.thread.getState().isRunning).toBe(true);
          expect(aui.thread.getState().messages.at(-1)?.id).toBe("answer");
        });
        if (interruption === "cancelled") {
          flushTapSync(() => aui.thread.cancelRun());
        } else {
          initial.error(streamError);
          await vi.waitFor(() =>
            expect(onError).toHaveBeenCalledWith(streamError),
          );
        }
        await vi.waitFor(() =>
          expect(aui.thread.getState().canResume).toBe(true),
        );
        const pending = Promise.resolve(
          aui.thread.resumeRun({ parentId: "answer" }),
        );
        if (result === "aborted") {
          await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
          flushTapSync(() => aui.thread.cancelRun());
        }
        const isResumeError = result === 404 || result === "network";
        if (!isResumeError) {
          await pending;
        } else {
          const resumeError: unknown = await pending.catch(
            (error: unknown) => error,
          );
          expect(resumeError).toBeInstanceOf(Error);
          expect(resumeError).not.toBe(streamError);
          expect(onResumeError).toHaveBeenCalledWith(resumeError);
          expect(onError).toHaveBeenLastCalledWith(resumeError);
        }
        const keepsCheckpoint = result === "aborted" || result === "network";
        await vi.waitFor(() =>
          expect(aui.thread.getState().canResume).toBe(keepsCheckpoint),
        );
        expect(storage.getStreamId("main")).toBe(
          keepsCheckpoint ? "stream-1" : null,
        );
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(onResumeError).toHaveBeenCalledTimes(isResumeError ? 1 : 0);
        expect(onError).toHaveBeenCalledTimes(
          (interruption === "failed" ? 1 : 0) + (isResumeError ? 1 : 0),
        );
        expect(aui.thread.getState().messages).toHaveLength(2);
        if (result === "network") {
          fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
          await aui.thread.resumeRun({ parentId: "answer" });
          expect(fetch).toHaveBeenCalledTimes(3);
          expect(storage.getStreamId("main")).toBeNull();
        }
      } finally {
        handle.destroy();
        storage.clear();
      }
    },
  );

  it("does not advertise manual resume from a stored stream id alone", async () => {
    const storage = createResumableSessionStorage({
      key: "resume-without-opt-in",
    });
    storage.clear();
    let initial!: ReadableStreamDefaultController<Uint8Array>;
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        new ReadableStream({ start: (controller) => (initial = controller) }),
        {
          headers: {
            "content-type": "text/event-stream",
            [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
          },
        },
      ),
    );
    const Host = createHost({});
    const handle = createAssistantClient(
      AuiConfig({
        threads: Host({
          transport: new AssistantChatTransport({
            fetch,
            resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
          }),
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    try {
      flushTapSync(() => aui.composer.setText("continue this response"));
      flushTapSync(() => aui.composer.send());
      for (const chunk of [
        { type: "start", messageId: "answer" },
        { type: "text-start", id: "text" },
        { type: "text-delta", id: "text", delta: "Partial" },
      ] satisfies UIMessageChunk[]) {
        initial.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
      }
      await vi.waitFor(() =>
        expect(aui.thread.getState().messages.at(-1)?.parts[0]).toMatchObject({
          type: "text",
          text: "Partial",
        }),
      );
      flushTapSync(() => aui.thread.cancelRun());
      await vi.waitFor(() =>
        expect(aui.thread.getState().isRunning).toBe(false),
      );
      expect(storage.getStreamId("main")).toBe("stream-1");
      expect(aui.thread.getState().canResume).toBe(false);
      await expect(
        aui.thread.resumeRun({ parentId: "answer" }),
      ).rejects.toThrow("Runtime does not support resuming runs.");
      await nextTask();
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      handle.destroy();
      storage.clear();
    }
  });

  it("resumes a stopped response without sending another message and consumes its checkpoint on finish", async () => {
    const storage = createResumableSessionStorage({ key: "composer-resume" });
    storage.clear();
    let initial!: ReadableStreamDefaultController<Uint8Array>;
    let resumed!: ReadableStreamDefaultController<Uint8Array>;
    const headers = {
      "content-type": "text/event-stream",
      [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({ start: (controller) => (initial = controller) }),
          { headers },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({ start: (controller) => (resumed = controller) }),
          { headers },
        ),
      );
    const transport = new AssistantChatTransport({
      fetch,
      resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
    });
    const emit = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      ...chunks: UIMessageChunk[]
    ) => {
      for (const chunk of chunks) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
      }
    };
    const Host = createHost({});
    const handle = createAssistantClient(
      AuiConfig({ threads: Host({ transport, canResume: true }) }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    try {
      expect(aui.thread.getState().canResume).toBe(false);
      flushTapSync(() => aui.composer.setText("continue this response"));
      flushTapSync(() => aui.composer.send());
      emit(
        initial,
        { type: "start", messageId: "answer" },
        { type: "text-start", id: "text" },
        { type: "text-delta", id: "text", delta: "Partial" },
      );
      await vi.waitFor(() => {
        expect(aui.thread.getState().messages.at(-1)?.parts[0]).toMatchObject({
          type: "text",
          text: "Partial",
        });
        expect(aui.thread.getState().isRunning).toBe(true);
        expect(aui.thread.getState().canResume).toBe(false);
      });
      flushTapSync(() => aui.thread.cancelRun());
      await vi.waitFor(() =>
        expect(aui.thread.getState().canResume).toBe(true),
      );
      expect(storage.getStreamId("main")).toBe("stream-1");
      expect(fetch).toHaveBeenCalledOnce();

      const pending = aui.thread.resumeRun({ parentId: "answer" });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      expect(fetch.mock.calls[1]?.[0]).toBe("/api/resume/stream-1");
      emit(
        resumed,
        { type: "start", messageId: "answer" },
        { type: "text-start", id: "text" },
        { type: "text-delta", id: "text", delta: "Partial complete" },
        { type: "text-end", id: "text" },
        { type: "finish" },
      );
      resumed.close();
      await pending;
      await vi.waitFor(() => {
        const state = aui.thread.getState();
        expect(state.isRunning).toBe(false);
        expect(state.canResume).toBe(false);
        expect(state.messages).toHaveLength(2);
        expect(state.messages.at(-1)?.id).toBe("answer");
        expect(state.messages.at(-1)?.parts[0]).toMatchObject({
          type: "text",
          text: "Partial complete",
        });
      });
      expect(storage.getStreamId("main")).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      handle.destroy();
      storage.clear();
    }
  });

  it("stops an in-flight chat on client destroy when stopOnClientDestroy is omitted", async () => {
    expect(await streamThenDestroy({})).toBe(1);
  });

  it("leaves an in-flight chat running on client destroy when stopOnClientDestroy is false", async () => {
    expect(await streamThenDestroy({ stopOnClientDestroy: false })).toBe(0);
  });
});
